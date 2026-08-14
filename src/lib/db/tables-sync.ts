import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { id, timestamps } from "./columns";

/**
 * Key/value metadata for the sync feature: OAuth tokens, client id, account
 * email, device id/name, last-synced revision, sync flags. Local-only — never
 * included in a sync payload.
 */
export const syncMeta = sqliteTable("sync_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  ...timestamps,
});

/**
 * Deletes of synced rows, captured by SQLite DELETE triggers (defined in
 * migration v15). A tombstone beats a live row only when its `deletedAt` is
 * newer than the row's `updatedAt` — this keeps undo/restore from being
 * clobbered by an older delete.
 */
export const syncTombstones = sqliteTable(
  "sync_tombstones",
  {
    id: id(),
    tableName: text("table_name").notNull(),
    rowId: text("row_id").notNull(),
    deletedAt: integer("deleted_at").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("sync_tombstones_table_row").on(t.tableName, t.rowId),
    index("sync_tombstones_deleted").on(t.deletedAt),
  ],
);

export type SyncMetaRow = typeof syncMeta.$inferSelect;
export type SyncTombstone = typeof syncTombstones.$inferSelect;
