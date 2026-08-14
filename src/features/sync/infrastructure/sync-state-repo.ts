import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { syncMeta, syncTombstones } from "@/lib/db/schema";
import type { SyncTombstoneItem } from "../domain";

/**
 * Persistence for sync state: key/value metadata (tokens, device identity,
 * last-synced revision) plus the local tombstone list. Local-only tables.
 */

export const SYNC_META_KEYS = {
  clientId: "client_id",
  accessToken: "access_token",
  refreshToken: "refresh_token",
  tokenExpiresAt: "token_expires_at",
  accountEmail: "account_email",
  deviceId: "device_id",
  deviceName: "device_name",
  lastRevision: "last_revision",
  lastSyncAt: "last_sync_at",
} as const;

export type SyncMetaKey = (typeof SYNC_META_KEYS)[keyof typeof SYNC_META_KEYS];

export async function getSyncMeta(key: string): Promise<string | null> {
  const row = await db.select().from(syncMeta).where(eq(syncMeta.key, key)).get();
  return (row as { value?: string } | undefined)?.value ?? null;
}

export async function setSyncMeta(key: string, value: string | number): Promise<void> {
  const ts = Date.now();
  const existing = await db.select().from(syncMeta).where(eq(syncMeta.key, key)).get();
  if (existing !== undefined) {
    await db
      .update(syncMeta)
      .set({ value: String(value), updatedAt: ts })
      .where(eq(syncMeta.key, key))
      .run();
    return;
  }
  await db.insert(syncMeta).values({ key, value: String(value), createdAt: ts, updatedAt: ts }).run();
}

export async function deleteSyncMeta(key: string): Promise<void> {
  await db.delete(syncMeta).where(eq(syncMeta.key, key)).run();
}

/** Drop the account's credentials (sign-out) — device identity stays. */
export async function clearAccountMeta(): Promise<void> {
  for (const key of [
    SYNC_META_KEYS.accessToken,
    SYNC_META_KEYS.refreshToken,
    SYNC_META_KEYS.tokenExpiresAt,
    SYNC_META_KEYS.accountEmail,
  ]) {
    await deleteSyncMeta(key);
  }
}

export async function listLocalTombstones(): Promise<SyncTombstoneItem[]> {
  const rows = await db.select().from(syncTombstones);
  return (rows as SyncTombstoneItem[]).map((row) => ({
    tableName: row.tableName,
    rowId: row.rowId,
    deletedAt: Number(row.deletedAt),
  }));
}

/** Remove a tombstone (undo restores the row, or the delete was applied from remote). */
export async function clearTombstone(tableName: string, rowId: string): Promise<void> {
  await db
    .delete(syncTombstones)
    .where(and(eq(syncTombstones.tableName, tableName), eq(syncTombstones.rowId, rowId)))
    .run();
}