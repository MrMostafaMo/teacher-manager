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

async function connect(): Promise<Database> {
  if (!sqlite) {
    sqlite = await Database.load(DB_URI);
  }
  return sqlite;
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
  if (method === "values") {
    return { rows: rows.map((row) => Object.values(row)) };
  }
  return { rows };
};

export const db = drizzle(remote, { schema });

/** Close the connection pool (used by backup/restore and on shutdown). */
export async function closeDatabase(): Promise<void> {
  if (sqlite) {
    await sqlite.close();
    sqlite = null;
  }
}

export type DatabaseClient = typeof db;
