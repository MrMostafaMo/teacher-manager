import { open, save, ask } from "@tauri-apps/plugin-dialog";
import { open as openFile } from "@tauri-apps/plugin-fs";
import {
  backupDatabase,
  liveDbPath,
  swapDatabaseFrom,
} from "@/features/settings/infrastructure/backup-service";

/** 16-byte SQLite file header: "SQLite format 3\0". */
const SQLITE_MAGIC = "SQLite format 3\0";

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

  return swapDatabaseFrom(path, async () => ask(confirmMessage, { kind: "warning" }));
}

export { liveDbPath };
