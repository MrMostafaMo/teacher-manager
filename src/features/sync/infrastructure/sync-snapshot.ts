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
    try {
      const all = await db.select().from(table);
      for (const row of all) {
        const id = String((row as { id?: unknown }).id ?? "");
        if (!id) continue;
        rows.push({ tableName, id, row: toSyncRow(row as Record<string, unknown>) });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("no such table")) {
        console.warn(`sync snapshot: missing table ${tableName}, skipping (needs migration)`);
        continue;
      }
      throw error;
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
    try {
      await db.delete(table).where(eq(table.id, key.rowId)).run();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("no such table")) {
        console.warn(`sync delete: missing table ${key.tableName}, skipping`);
        continue;
      }
      throw error;
    }
    await clearTombstone(key.tableName, key.rowId);
  }
}

async function upsertRow(table: IdTable | undefined, op: PullOp): Promise<void> {
  if (table === undefined) return;
  let existing: unknown;
  try {
    existing = await db.select().from(table).where(eq(table.id, op.key.rowId)).get();
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("no such table")) {
      console.warn(`sync upsert: missing table ${op.key.tableName}, skipping`);
      return;
    }
    throw error;
  }
  if (existing !== undefined) {
    let rowToSet: SyncRow = op.row;
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        await db
          .update(table)
          .set(rowToSet as never)
          .where(eq(table.id, op.key.rowId))
          .run();
        return;
      } catch (error) {
        const col = extractMissingColumn(error);
        if (col && col in rowToSet) {
          console.warn(`sync upsert: stripping unknown column ${col} for ${op.key.tableName}`);
          const { [col]: _omit, ...rest } = rowToSet;
          void _omit;
          rowToSet = rest as SyncRow;
          continue;
        }
        throw error;
      }
    }
    return;
  }
  let rowToInsert: SyncRow = op.row;
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      await db.insert(table).values(rowToInsert as never).run();
      return;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      const col = extractMissingColumn(error);
      if (col && col in rowToInsert) {
        console.warn(`sync upsert: stripping unknown column ${col} for ${op.key.tableName}`);
        const { [col]: _omit2, ...rest } = rowToInsert;
        void _omit2;
        rowToInsert = rest as SyncRow;
        continue;
      }
      if (msg.includes("UNIQUE constraint failed")) {
        console.error("sync upsert failed", error);
        return;
      }
      throw error;
    }
  }
}

function extractMissingColumn(error: unknown): string | null {
  const msg = error instanceof Error ? error.message : "";
  const m1 = msg.match(/no such column:\s*"?(\w+)"?/i);
  if (m1) return m1[1];
  const m2 = msg.match(/has no column named\s+"?(\w+)"?/i);
  if (m2) return m2[1];
  return null;
}
