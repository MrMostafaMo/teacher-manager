import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { id, timestamps } from "./columns";

/**
 * Audit trail for every mutation. `details` is a JSON string; the activity
 * log service (`src/lib/activity-log.ts`) is the only writer.
 */
export const activityLogs = sqliteTable(
  "activity_logs",
  {
    id: id(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    details: text("details"),
    ...timestamps,
  },
  (t) => [
    index("activity_logs_created").on(t.createdAt),
    index("activity_logs_entity").on(t.entityType, t.entityId),
  ],
);

export type ActivityLog = typeof activityLogs.$inferSelect;
