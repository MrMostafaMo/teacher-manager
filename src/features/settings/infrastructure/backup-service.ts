import { appConfigDir, join } from "@tauri-apps/api/path";
import { copyFile, exists, remove, stat } from "@tauri-apps/plugin-fs";
import Database from "@tauri-apps/plugin-sql";
import { sql } from "drizzle-orm";
import { db, closeDatabase, queryFirst } from "@/lib/db/client";
import { appMeta } from "@/lib/db/schema";

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

/** Highest applied migration in a database file (tracks the schema version). */
export async function schemaVersion(uri: string): Promise<number | null> {
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

export type SwapResult = { status: "cancelled" | "done" | "error"; message?: string };

/**
 * Replace the live database with `sourcePath`: schema-version guard, user
 * confirm, snapshot + rollback on failure. Shared by local and cloud restore.
 */
export async function swapDatabaseFrom(
  sourcePath: string,
  confirm: () => Promise<boolean>,
): Promise<SwapResult> {
  const dbPath = await liveDbPath();
  const [backupVersion, live] = await Promise.all([
    schemaVersion(`sqlite:${sourcePath}`),
    queryFirst<{ v: number | null }>("SELECT MAX(version) AS v FROM _sqlx_migrations", []),
  ]);
  const liveVersion = live?.v ?? null;
  if (
    backupVersion === null ||
    (liveVersion !== null && backupVersion > liveVersion)
  ) {
    return { status: "error", message: "restoreVersionMismatch" };
  }
  if (!(await confirm())) return { status: "cancelled" };

  // Keep a snapshot of the current DB so a failed swap can be rolled back.
  const snapshotPath = dbPath + ".pre-restore";
  await remove(snapshotPath).catch(() => undefined);
  await copyFile(dbPath, snapshotPath);

  try {
    await closeDatabase();
    await copyFile(sourcePath, dbPath);
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
