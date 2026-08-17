import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { id, timestamps } from "./columns";
import { plans } from "./tables-core";
import { students } from "./tables-students";

/** Payment records. `period` is the billed ISO month (YYYY-MM), when applicable. */
export const payments = sqliteTable(
  "payments",
  {
    id: id(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    planId: text("plan_id").references(() => plans.id, { onDelete: "set null" }),
    amount: integer("amount").notNull(),
    period: text("period"),
    method: text("method", { enum: ["cash", "card", "transfer"] as const })
      .notNull()
      .default("cash"),
    note: text("note"),
    paidAt: integer("paid_at").notNull(),
    ...timestamps,
  },
  (t) => [index("payments_student").on(t.studentId), index("payments_paid_at").on(t.paidAt)],
);

/** Outgoing costs (prizes, stationery, utilities…) — money spent by the center. */
export const expenseCategories = [
  "prizes",
  "stationery",
  "utilities",
  "maintenance",
  "other",
] as const;

export const expenses = sqliteTable(
  "expenses",
  {
    id: id(),
    title: text("title").notNull(),
    category: text("category", { enum: expenseCategories }).notNull(),
    amount: integer("amount").notNull(),
    note: text("note"),
    spentAt: integer("spent_at").notNull(),
    ...timestamps,
  },
  (t) => [index("expenses_spent_at").on(t.spentAt)],
);

export type Payment = typeof payments.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
