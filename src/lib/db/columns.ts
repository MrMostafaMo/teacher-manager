import { integer, text } from "drizzle-orm/sqlite-core";

/**
 * Shared column builders used by every table.
 * - `id`: UUID primary key (v4 strings generated in the application layer)
 * - `timestamps`: created_at / updated_at as unix epoch milliseconds
 *   (the SQL plugin's prepared statements cannot use SQLite CURRENT_TIMESTAMP,
 *   so repositories set these explicitly — this keeps them correct on every write).
 */
export const id = () => text("id").primaryKey();

export const timestamps = {
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
} as const;
