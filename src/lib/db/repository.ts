import { asc, count, desc, eq } from "drizzle-orm";
import type { AnySQLiteColumn, AnySQLiteTable } from "drizzle-orm/sqlite-core";
import { db } from "@/lib/db/client";

/**
 * Generic CRUD repository over a single table.
 *
 * Every table in this app follows the schema conventions (uuid `id`,
 * `created_at`/`updated_at` unix-ms), so one implementation serves them all.
 * Repositories set timestamps; the application layer supplies the id.
 */
export type RepositoryTable = AnySQLiteTable & {
  id: AnySQLiteColumn;
  createdAt: AnySQLiteColumn;
};

export interface Repository<T extends RepositoryTable> {
  findById: (id: string) => Promise<T["$inferSelect"] | undefined>;
  list: (options?: { limit?: number; newestFirst?: boolean }) => Promise<T["$inferSelect"][]>;
  count: () => Promise<number>;
  insert: (
    values: Omit<T["$inferInsert"], "createdAt" | "updatedAt">,
  ) => Promise<T["$inferSelect"]>;
  update: (
    id: string,
    values: Partial<Omit<T["$inferInsert"], "id" | "createdAt" | "updatedAt">>,
  ) => Promise<T["$inferSelect"] | undefined>;
  remove: (id: string) => Promise<boolean>;
}

export function createRepository<T extends RepositoryTable>(table: T): Repository<T> {
  type Row = T["$inferSelect"];
  type Insert = T["$inferInsert"];

  async function findById(id: string): Promise<Row | undefined> {
    const row = await db.select().from(table).where(eq(table.id, id)).get();
    return row as Row | undefined;
  }

  async function list(options: { limit?: number; newestFirst?: boolean } = {}): Promise<Row[]> {
    const order = options.newestFirst ? desc(table.createdAt) : asc(table.createdAt);
    const base = db.select().from(table).orderBy(order);
    const query = options.limit !== undefined ? base.limit(options.limit) : base;
    const rows = await query;
    return rows as Row[];
  }

  async function countRows(): Promise<number> {
    const row = await db.select({ n: count() }).from(table).get();
    return row?.n ?? 0;
  }

  async function insert(values: Omit<Insert, "createdAt" | "updatedAt">): Promise<Row> {
    const ts = Date.now();
    await db.insert(table).values({ ...values, createdAt: ts, updatedAt: ts } as Insert);
    const row = await findById((values as { id: string }).id);
    if (!row) throw new Error(`insert failed: row ${(values as { id: string }).id} not found`);
    return row;
  }

  async function update(
    id: string,
    values: Partial<Omit<Insert, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Row | undefined> {
    await db
      .update(table)
      .set({ ...values, updatedAt: Date.now() } as Partial<Insert>)
      .where(eq(table.id, id));
    return findById(id);
  }

  async function remove(id: string): Promise<boolean> {
    // The proxy's `run` resolves to `{ rows: [{ lastInsertRowid, changes }] }`
    // but drizzle's public type keeps `rows` opaque — cast through unknown.
    const result = (await db.delete(table).where(eq(table.id, id)).run()) as unknown as {
      rows?: Array<{ changes?: number }>;
    };
    return (result.rows?.[0]?.changes ?? 0) > 0;
  }

  return { findById, list, count: countRows, insert, update, remove };
}
