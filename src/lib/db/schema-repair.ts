import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

/**
 * Tables safe to recreate empty when missing: transient or rebuildable data
 * only (transient logs/notifications, re-syncable price history). Anything
 * else missing means real user data loss and must stay a visible block.
 *
 * DDL is copied verbatim from the original migrations (same column order as
 * the Drizzle schema, which the sqlite-proxy reads positionally), wrapped in
 * IF NOT EXISTS so healthy databases are untouched.
 */
export const RECREATABLE_TABLES = [
  "activity_logs",
  "notifications",
  "plan_price_history",
  "sync_tombstones",
] as const;

const STATEMENTS: Record<string, string[]> = {
  activity_logs: [
    `CREATE TABLE IF NOT EXISTS \`activity_logs\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`action\` text NOT NULL,
	\`entity_type\` text NOT NULL,
	\`entity_id\` text,
	\`details\` text,
	\`created_at\` integer NOT NULL,
	\`updated_at\` integer NOT NULL
)`,
    "CREATE INDEX IF NOT EXISTS `activity_logs_created` ON `activity_logs` (`created_at`)",
    "CREATE INDEX IF NOT EXISTS `activity_logs_entity` ON `activity_logs` (`entity_type`,`entity_id`)",
  ],
  notifications: [
    `CREATE TABLE IF NOT EXISTS \`notifications\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`type\` text NOT NULL,
	\`key\` text NOT NULL,
	\`details\` text NOT NULL,
	\`read\` integer DEFAULT false NOT NULL,
	\`dismissed\` integer DEFAULT false NOT NULL,
	\`created_at\` integer NOT NULL,
	\`updated_at\` integer NOT NULL
)`,
    "CREATE UNIQUE INDEX IF NOT EXISTS `notifications_key_unique` ON `notifications` (`key`)",
  ],
  plan_price_history: [
    `CREATE TABLE IF NOT EXISTS \`plan_price_history\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`plan_id\` text NOT NULL,
	\`amount\` integer NOT NULL,
	\`effective_from\` integer NOT NULL,
	\`created_at\` integer NOT NULL,
	\`updated_at\` integer NOT NULL,
	FOREIGN KEY (\`plan_id\`) REFERENCES \`plans\`(\`id\`) ON UPDATE no action ON DELETE cascade
)`,
    "CREATE INDEX IF NOT EXISTS `plan_price_history_plan` ON `plan_price_history` (`plan_id`)",
    "DROP TRIGGER IF EXISTS `trg_sync_plan_price_history`",
    "CREATE TRIGGER `trg_sync_plan_price_history` AFTER DELETE ON `plan_price_history` BEGIN INSERT INTO sync_tombstones (id, table_name, row_id, deleted_at, created_at, updated_at) VALUES (lower(hex(randomblob(16))), 'plan_price_history', OLD.id, (CAST(strftime('%s','now') AS INTEGER) * 1000), (CAST(strftime('%s','now') AS INTEGER) * 1000), (CAST(strftime('%s','now') AS INTEGER) * 1000)); END",
  ],
  sync_tombstones: [
    `CREATE TABLE IF NOT EXISTS \`sync_tombstones\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`table_name\` text NOT NULL,
	\`row_id\` text NOT NULL,
	\`deleted_at\` integer NOT NULL,
	\`created_at\` integer NOT NULL,
	\`updated_at\` integer NOT NULL
)`,
    "CREATE UNIQUE INDEX IF NOT EXISTS `sync_tombstones_table_row` ON `sync_tombstones` (`table_name`,`row_id`)",
    "CREATE INDEX IF NOT EXISTS `sync_tombstones_deleted` ON `sync_tombstones` (`deleted_at`)",
  ],
};

/** SQL statements that recreate the given missing tables (unknown names ignored). */
export function repairStatements(missing: string[]): string[] {
  const wanted = new Set(missing);
  return RECREATABLE_TABLES.flatMap((t) => (wanted.has(t) ? STATEMENTS[t] : []));
}

/** Execute the repair; resolves with the table names that were recreated. */
export async function repairSchema(missing: string[]): Promise<string[]> {
  const repaired: string[] = [];
  for (const table of RECREATABLE_TABLES) {
    if (!missing.includes(table)) continue;
    for (const stmt of STATEMENTS[table]) {
      // Sequential on purpose: the trigger drop must land before its recreate.
      await db.run(sql.raw(stmt));
    }
    repaired.push(table);
  }
  return repaired;
}
