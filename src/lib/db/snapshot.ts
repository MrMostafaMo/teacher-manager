import { eq, inArray } from "drizzle-orm";
import type { AnySQLiteColumn, AnySQLiteTable } from "drizzle-orm/sqlite-core";
import { db } from "@/lib/db/client";

/**
 * Delete snapshots: capture rows before a delete and re-insert them verbatim
 * (original ids + timestamps) when an undo runs. SQLite foreign keys are off,
 * so restore order only matters for readability — parents before children.
 */

type IdTable = AnySQLiteTable & { id: AnySQLiteColumn };

export async function captureRows<T extends IdTable>(
  table: T,
  ids: string[],
): Promise<T["$inferSelect"][]> {
  if (ids.length === 0) return [];
  return (await db.select().from(table).where(inArray(table.id, ids))) as T["$inferSelect"][];
}

export async function captureBy<T extends AnySQLiteTable>(
  table: T,
  column: AnySQLiteColumn,
  value: string | null,
): Promise<T["$inferSelect"][]> {
  return (await db.select().from(table).where(eq(column, value))) as T["$inferSelect"][];
}

export async function captureIn<T extends AnySQLiteTable>(
  table: T,
  column: AnySQLiteColumn,
  values: string[],
): Promise<T["$inferSelect"][]> {
  if (values.length === 0) return [];
  return (await db.select().from(table).where(inArray(column, values))) as T["$inferSelect"][];
}

export async function restoreRows<T extends AnySQLiteTable>(
  table: T,
  rows: T["$inferSelect"][],
): Promise<void> {
  for (const row of rows) {
    // Verbatim insert: rows carry every column including id + timestamps.
    await db.insert(table).values(row as never).run();
  }
}
