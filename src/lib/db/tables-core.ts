import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { id, timestamps } from "./columns";

/** Key/value metadata table. Stores schema version and app-level flags. */
export const appMeta = sqliteTable("app_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  ...timestamps,
});

/** Subscription plans (e.g. monthly, term). Amount in EGP as integer. */
export const plans = sqliteTable("plans", {
  id: id(),
  name: text("name").notNull(),
  amount: integer("amount").notNull(),
  billingInterval: text("billing_interval", {
    enum: ["monthly", "term", "yearly"] as const,
  })
    .notNull()
    .default("monthly"),
  ...timestamps,
});

export type AppMeta = typeof appMeta.$inferSelect;
export type AppMetaInsert = typeof appMeta.$inferInsert;
export type Plan = typeof plans.$inferSelect;
