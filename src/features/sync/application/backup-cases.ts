import { appConfigDir, join } from "@tauri-apps/api/path";
import { readFile, remove, writeFile } from "@tauri-apps/plugin-fs";
import { uuid } from "@/lib/utils/uuid";
import { backupDatabase, swapDatabaseFrom, type SwapResult } from "@/features/settings/infrastructure/backup-service";
import { SupabaseProvider } from "../infrastructure/supabase-provider";

const BACKUPS_FOLDER = "backups";

export type CloudBackupResult = { status: "ok" | "error"; message?: string };
export type CloudRestoreResult = SwapResult | { status: "notFound" };

export async function cloudBackupDatabase(deviceName: string): Promise<CloudBackupResult> {
  const provider = new SupabaseProvider();
  if (!(await provider.isConfigured().catch(() => false))) return { status: "error", message: "sync.errors.notConnected" };
  const fileName = `backup-${deviceName}-${Date.now()}.db`;
  const temp = await join(await appConfigDir(), fileName);
  try {
    await backupDatabase(temp);
    const bytes = await readFile(temp);
    await provider.uploadBytes(fileName, bytes, BACKUPS_FOLDER);
    return { status: "ok" };
  } catch (error) {
    console.error("cloud backup failed", error);
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("unauthorized") || msg.includes("401") || msg.includes("403")) return { status: "error", message: "sync.errors.notConnected" };
    return { status: "error", message: "sync.settings.backupError" };
  } finally {
    await remove(temp).catch(() => undefined);
  }
}

export async function cloudRestoreDatabase(confirm: () => Promise<boolean>): Promise<CloudRestoreResult> {
  const provider = new SupabaseProvider();
  try {
    const files = await provider.listFiles(BACKUPS_FOLDER);
    const latest = files[0];
    if (!latest) return { status: "notFound" };
    const temp = await join(await appConfigDir(), `restore-${uuid()}.db`);
    try {
      await writeFile(temp, await provider.downloadBytes(latest.id));
      return await swapDatabaseFrom(temp, confirm);
    } finally {
      await remove(temp).catch(() => undefined);
    }
  } catch (error) {
    console.error(`restore failed`, error);
    return { status: "notFound" };
  }
}
