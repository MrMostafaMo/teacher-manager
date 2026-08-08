import Database from "@tauri-apps/plugin-sql";
import { drizzle, type AsyncRemoteCallback } from "drizzle-orm/sqlite-proxy";
import * as schema from "@/lib/db/schema";

/**
 * Database bootstrap.
 *
 * The real SQLite file lives in the OS app-data directory
 * (`sqlite:teacher-manager.db`). The Tauri SQL plugin runs every statement
 * in Rust with parameterized binds; Drizzle runs in the frontend as a proxy,
 * so the application always goes through typed query builders and never
 * concatenates SQL by hand (no injection surface).
 *
 * Schema migrations are embedded in the Rust binary and applied by the
 * plugin automatically on first launch (see `src-tauri/src/lib.rs`).
 */

const DB_URI = "sqlite:teacher-manager.db";

let sqlite: Database | null = null;
let connecting: Promise<Database> | null = null;

/**
 * Return the shared connection, opening it at most once. The promise is
 * memoized so concurrent callers during first load share a single
 * `Database.load` instead of racing to open separate pools.
 */
function connect(): Promise<Database> {
  if (sqlite) return Promise.resolve(sqlite);
  connecting ??= Database.load(DB_URI)
    .then((db) => {
      sqlite = db;
      return db;
    })
    .finally(() => {
      connecting = null;
    });
  return connecting;
}

/** Bridge between Drizzle's proxy driver and the Tauri SQL plugin. */
const remote: AsyncRemoteCallback = async (sql, params, method) => {
  const connection = await connect();

  if (method === "run") {
    const result = await connection.execute(sql, params as unknown[]);
    return {
      rows: [
        {
          lastInsertRowid: result.lastInsertId ?? 0,
          changes: result.rowsAffected,
        },
      ],
    };
  }

  const rows = await connection.select<Record<string, unknown>[]>(sql, params as unknown[]);
  if (method === "get") {
    // drizzle 0.45's sqlite-proxy treats a truthy-but-empty `rows` array as a
    // real row and maps it to `{}`, so `get()` never returned `undefined` on
    // empty results — which made every "does this row exist?" check see a
    // phantom row (upserts always took the update branch, inserts never ran).
    // A falsy `rows` is what makes the driver resolve `get()` to `undefined`.
    // `null` here is falsy, which is what makes the driver's `get()` resolve to
    // `undefined`; cast to satisfy the proxy's `rows: any[]` signature.
    return { rows: (rows.length ? Object.values(rows[0]) : null) as unknown as unknown[] };
  }
  return { rows: rows.map((row) => Object.values(row)) };
};

export const db = drizzle(remote, { schema });

/** Run one raw SELECT and return its first row (used by restore validation). */
export async function queryFirst<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T | undefined> {
  const connection = await connect();
  const rows = await connection.select<Record<string, unknown>[]>(sql, params as unknown[]);
  return (rows[0] ?? undefined) as T | undefined;
}

/** Close the connection pool (used by backup/restore and on shutdown). */
export async function closeDatabase(): Promise<void> {
  if (sqlite) {
    await sqlite.close();
    sqlite = null;
  }
}

export type DatabaseClient = typeof db;
