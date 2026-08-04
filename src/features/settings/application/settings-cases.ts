import { open, save, ask } from "@tauri-apps/plugin-dialog";
import { copyFile, readFile, remove } from "@tauri-apps/plugin-fs";
import { db, closeDatabase } from "@/lib/db/client";
import { appMeta } from "@/lib/db/schema";
import {
  backupDatabase,
  liveDbPath,
} from "@/features/settings/infrastructure/backup-service";

const SQLITE_MAGIC = new TextEncoder().encode("SQLite format 3\0");

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

  const bytes = await readFile(path);
  if (bytes.length < SQLITE_MAGIC.length) {
    return { status: "error", message: "invalidBackup" };
  }
  for (let i = 0; i < SQLITE_MAGIC.length; i++) {
    if (bytes[i] !== SQLITE_MAGIC[i]) return { status: "error", message: "invalidBackup" };
  }

  const confirmed = await ask(confirmMessage, { kind: "warning" });
  if (!confirmed) return { status: "cancelled" };

  const dbPath = await liveDbPath();
  try {
    await closeDatabase();
    await copyFile(path, dbPath);
    for (const suffix of ["-wal", "-shm"]) {
      await remove(dbPath + suffix).catch(() => undefined);
    }
    await db.select().from(appMeta).limit(1);
    return { status: "done" };
  } catch (error) {
    console.error("Restore failed", error);
    return { status: "error", message: "restoreError" };
  }
}

export { liveDbPath };
