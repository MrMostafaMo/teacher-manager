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

/** Historical prices for plans to avoid retroactively altering past statements. */
export const planPriceHistory = sqliteTable("plan_price_history", {
  id: id(),
  planId: text("plan_id")
    .notNull()
    .references(() => plans.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  /** The effective date as YYYY-MM-DD or unix ms. Let's use unix ms for consistency. */
  effectiveFrom: integer("effective_from", { mode: "timestamp_ms" }).notNull(),
  ...timestamps,
});

export type AppMeta = typeof appMeta.$inferSelect;
export type AppMetaInsert = typeof appMeta.$inferInsert;
export type Plan = typeof plans.$inferSelect;
export type PlanPriceHistory = typeof planPriceHistory.$inferSelect;
