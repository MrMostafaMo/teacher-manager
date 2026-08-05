import { and, desc, gte, lt } from "drizzle-orm";
import dayjs from "dayjs";
import { db } from "@/lib/db/client";
import { expenses, type Expense } from "@/lib/db/schema";
import { createRepository } from "@/lib/db/repository";

/**
 * Expenses repository: generic CRUD plus a month-range query on `spentAt`.
 */
export const expenseRepository = {
  ...createRepository(expenses),

  /** All expenses spent inside the given ISO month (YYYY-MM). */
  async byMonth(period: string): Promise<Expense[]> {
    const start = dayjs(`${period}-01`).startOf("month").valueOf();
    const end = dayjs(`${period}-01`).add(1, "month").startOf("month").valueOf();
    const rows = (await db
      .select()
      .from(expenses)
      .where(and(gte(expenses.spentAt, start), lt(expenses.spentAt, end)))
      .orderBy(desc(expenses.spentAt))) as Expense[];
    return rows;
  },
};
