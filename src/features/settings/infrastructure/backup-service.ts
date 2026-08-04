import { appConfigDir, join } from "@tauri-apps/api/path";
import { copyFile, exists, stat } from "@tauri-apps/plugin-fs";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

/** Absolute path of the live SQLite file (the SQL plugin's app-config dir). */
export async function liveDbPath(): Promise<string> {
  return join(await appConfigDir(), "teacher-manager.db");
}

/** Size of the live database in bytes (0 when it doesn't exist yet). */
export async function liveDbSize(): Promise<number> {
  try {
    const info = await stat(await liveDbPath());
    return info.size;
  } catch {
    return 0;
  }
}

/**
 * Snapshot the open database into `dest`. Primary path is SQLite's
 * `VACUUM INTO` — a consistent copy of a live WAL database in one statement
 * (the write happens in Rust, so no fs permission is needed for the target).
 *
 * ponytail: if sqlx ever rejects VACUUM INTO, fall back to a checkpoint then a
 * plain file copy.
 */
export async function backupDatabase(dest: string): Promise<void> {
  try {
    const escaped = dest.replace(/'/g, "''");
    await db.run(sql.raw(`VACUUM INTO '${escaped}'`));
    return;
  } catch (error) {
    console.error("VACUUM INTO failed, falling back to checkpoint + copy", error);
  }
  await db.run(sql.raw("PRAGMA wal_checkpoint(TRUNCATE)"));
  const src = await liveDbPath();
  await copyFile(src, dest);
  for (const suffix of ["-wal", "-shm"]) {
    const side = src + suffix;
    if (await exists(side)) await copyFile(side, dest + suffix);
  }
}
