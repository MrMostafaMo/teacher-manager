import { eq } from "drizzle-orm";
import type { AnySQLiteColumn, AnySQLiteTable } from "drizzle-orm/sqlite-core";
import { db } from "@/lib/db/client";
import {
  SYNC_TABLES,
  syncPayloadSchema,
  tableNameOf,
  type RowRef,
  type SyncPayload,
  type SyncRow,
} from "../domain";
import type { PullOp, PullResult } from "../application/merge-pull";
import { clearTombstone } from "./sync-state-repo";

/**
 * DB <-> payload bridge: reads every synced row into a local snapshot,
 * serializes/parses the remote payload, and persists a pull result.
 */

type IdTable = AnySQLiteTable & { id: AnySQLiteColumn };

function toSyncRow(row: Record<string, unknown>): SyncRow {
  const out: SyncRow = {};
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === "string" || typeof value === "number" || value === null) {
      out[key] = value;
    }
  }
  return out;
}

export async function buildLocalSnapshot(): Promise<RowRef[]> {
  const rows: RowRef[] = [];
  for (const table of SYNC_TABLES) {
    const tableName = tableNameOf(table);
    const all = await db.select().from(table);
    for (const row of all) {
      const id = String((row as { id?: unknown }).id ?? "");
      if (!id) continue;
      rows.push({ tableName, id, row: toSyncRow(row as Record<string, unknown>) });
    }
  }
  return rows;
}

export function serializePayload(payload: SyncPayload): string {
  return JSON.stringify(payload);
}

/** Parse + validate a downloaded payload; throws on malformed JSON. */
export function parsePayload(text: string): SyncPayload {
  return syncPayloadSchema.parse(JSON.parse(text));
}

export async function applyPullResult(result: PullResult): Promise<void> {
  const byName = new Map(SYNC_TABLES.map((table) => [tableNameOf(table), table]));
  for (const op of result.toApply) {
    await upsertRow(byName.get(op.key.tableName) as IdTable | undefined, op);
  }
  for (const key of result.toDelete) {
    const table = byName.get(key.tableName) as IdTable | undefined;
    if (table === undefined) continue;
    await db.delete(table).where(eq(table.id, key.rowId)).run();
    // The DELETE trigger just recorded this sync-applied delete — drop it so
    // user-initiated deletes stay distinguishable.
    await clearTombstone(key.tableName, key.rowId);
  }
}

async function upsertRow(table: IdTable | undefined, op: PullOp): Promise<void> {
  if (table === undefined) return;
  const existing = await db
    .select()
    .from(table)
    .where(eq(table.id, op.key.rowId))
    .get();
  if (existing !== undefined) {
    await db
      .update(table)
      .set(op.row as never)
      .where(eq(table.id, op.key.rowId))
      .run();
    return;
  }
  try {
    await db.insert(table).values(op.row as never).run();
  } catch (error) {
    // Unique-key clash (e.g. attendance student+date from another device):
    // keep the local row; the report flags it via the skipped count.
    console.error("sync upsert failed", error);
  }
}