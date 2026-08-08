import { open, save, ask } from "@tauri-apps/plugin-dialog";
import { copyFile, open as openFile, remove } from "@tauri-apps/plugin-fs";
import Database from "@tauri-apps/plugin-sql";
import { db, closeDatabase, queryFirst } from "@/lib/db/client";
import { appMeta } from "@/lib/db/schema";
import {
  backupDatabase,
  liveDbPath,
} from "@/features/settings/infrastructure/backup-service";

/** 16-byte SQLite file header: "SQLite format 3\0". */
const SQLITE_MAGIC = "SQLite format 3\0";

/** Highest applied migration in a database file (tracks the schema version). */
async function schemaVersion(uri: string): Promise<number | null> {
  const probe = await Database.load(uri);
  try {
    const rows = await probe.select<Array<{ v: number | null }>>(
      "SELECT MAX(version) AS v FROM _sqlx_migrations",
      [],
    );
    return rows[0]?.v ?? null;
  } catch {
    return null;
  } finally {
    await probe.close();
  }
}

export type BackupResult = { saved: boolean; path?: string };
export type RestoreResult = { status: "cancelled" | "done" | "error"; message?: string };

/** Native save dialog + VACUUM INTO snapshot. Cancelled returns { saved: false }. */
export async function createBackup(): Promise<BackupResult> {
  const today = new Date().toISOString().slice(0, 10);
  const path = await save({
    defaultPath: `teacher-manager-backup-${today}.db`,
    filters: [{ name: "Database", extensions: ["db"] }],
  });
  if (!path) return { saved: false };
  await backupDatabase(path);
  return { saved: true, path };
}

/** Pick a backup, validate it, confirm, then replace the live database. */
export async function restoreFromBackup(confirmMessage: string): Promise<RestoreResult> {
  const path = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "Database", extensions: ["db"] }],
  });
  if (!path) return { status: "cancelled" };

  const dbPath = await liveDbPath();
  if (path === dbPath) return { status: "error", message: "invalidBackup" };

  // Verify the SQLite magic from just the header (no full-file read).
  const handle = await openFile(path, { read: true });
  try {
    const head = new Uint8Array(SQLITE_MAGIC.length);
    const n = (await handle.read(head)) ?? 0;
    if (n < SQLITE_MAGIC.length) return { status: "error", message: "invalidBackup" };
    for (let i = 0; i < SQLITE_MAGIC.length; i++) {
      if (head[i] !== SQLITE_MAGIC.charCodeAt(i)) {
        return { status: "error", message: "invalidBackup" };
      }
    }
  } finally {
    await handle.close();
  }

  // Schema-version guard: restoring a backup from a different migration level
  // would desync the app's queries from the real table shape.
  const [backupVersion, live] = await Promise.all([
    schemaVersion(`sqlite:${path}`),
    queryFirst<{ v: number | null }>(
      "SELECT MAX(version) AS v FROM _sqlx_migrations",
      [],
    ),
  ]);
  const liveVersion = live?.v ?? null;
  if (backupVersion === null || backupVersion !== liveVersion) {
    return { status: "error", message: "restoreVersionMismatch" };
  }

  const confirmed = await ask(confirmMessage, { kind: "warning" });
  if (!confirmed) return { status: "cancelled" };

  // Keep a snapshot of the current DB so a failed swap can be rolled back.
  const snapshotPath = dbPath + ".pre-restore";
  await remove(snapshotPath).catch(() => undefined);
  await copyFile(dbPath, snapshotPath);

  try {
    await closeDatabase();
    await copyFile(path, dbPath);
    for (const suffix of ["-wal", "-shm"]) {
      await remove(dbPath + suffix).catch(() => undefined);
    }
    await db.select().from(appMeta).limit(1);
    return { status: "done" };
  } catch (error) {
    console.error("Restore failed, rolling back", error);
    await closeDatabase().catch(() => undefined);
    await copyFile(snapshotPath, dbPath).catch(() => undefined);
    await remove(snapshotPath).catch(() => undefined);
    return { status: "error", message: "restoreError" };
  }
}

export { liveDbPath };
