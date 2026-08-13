import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { id, timestamps } from "./columns";

/**
 * In-app notifications generated from feature data (overdue homework, unpaid
 * dues, schedule exceptions, weak skills, low attendance). `key` is a stable
 * dedup identity (`source:id` / `source:student:month`) that survives
 * regeneration; `details` is a JSON string rendered through i18n templates.
 */
export const notifications = sqliteTable("notifications", {
  id: id(),
  type: text("type").notNull(),
  key: text("key").notNull().unique(),
  details: text("details").notNull(),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  dismissed: integer("dismissed", { mode: "boolean" }).notNull().default(false),
  ...timestamps,
});

export type NotificationRow = typeof notifications.$inferSelect;
