/**
 * Cloud backup/restore: a full .db snapshot (VACUUM INTO) uploaded to the
 * app's Drive "backups" folder, and restore of the newest backup via the
 * shared swapDatabaseFrom flow (schema guard + confirm + rollback).
 */

import { appConfigDir, join } from "@tauri-apps/api/path";
import { readFile, remove, writeFile } from "@tauri-apps/plugin-fs";
import { uuid } from "@/lib/utils/uuid";
import {
  backupDatabase,
  swapDatabaseFrom,
  type SwapResult,
} from "@/features/settings/infrastructure/backup-service";
import { DriveClient } from "../infrastructure/drive-client";
import { buildDriveSession } from "./sync-session";

const BACKUPS_FOLDER = "backups";

export type CloudBackupResult = { status: "ok" | "error"; message?: string };
export type CloudRestoreResult = SwapResult | { status: "notFound" };

/** Upload a consistent snapshot of the live DB to Drive, named by device. */
export async function cloudBackupDatabase(deviceName: string): Promise<CloudBackupResult> {
  const client = new DriveClient(await buildDriveSession());
  const fileName = `backup-${deviceName}-${Date.now()}.db`;
  const temp = await join(await appConfigDir(), fileName);
  try {
    await backupDatabase(temp);
    const bytes = await readFile(temp);
    await client.uploadBytes(fileName, bytes, BACKUPS_FOLDER);
    return { status: "ok" };
  } catch (error) {
    console.error("cloud backup failed", error);
    return { status: "error", message: "backupError" };
  } finally {
    await remove(temp).catch(() => undefined);
  }
}

/** Restore the newest cloud backup after the user confirms the swap. */
export async function cloudRestoreDatabase(
  confirm: () => Promise<boolean>,
): Promise<CloudRestoreResult> {
  const client = new DriveClient(await buildDriveSession());
  const files = await client.listFiles(BACKUPS_FOLDER);
  const latest = files[0];
  if (latest === undefined) return { status: "notFound" };

  const temp = await join(await appConfigDir(), `restore-${uuid()}.db`);
  try {
    await writeFile(temp, await client.downloadBytes(latest.id));
    return await swapDatabaseFrom(temp, confirm);
  } finally {
    await remove(temp).catch(() => undefined);
  }
}