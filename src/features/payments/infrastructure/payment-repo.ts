import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { payments, type Payment } from "@/lib/db/schema";
import { students } from "@/lib/db/tables-students";
import { plans } from "@/lib/db/tables-core";
import { createRepository } from "@/lib/db/repository";

export interface PaymentHistoryFilters {
  studentId?: string;
  period?: string;
  limit?: number;
  offset?: number;
}

/**
 * Payments repository: generic CRUD plus period/student queries and a
 * single-query history join (payments ⋈ student/plan names).
 */
export const paymentRepository = {
  ...createRepository(payments),

  async byPeriod(period: string): Promise<Payment[]> {
    const rows = (await db
      .select()
      .from(payments)
      .where(eq(payments.period, period))
      .orderBy(desc(payments.paidAt))) as Payment[];
    return rows;
  },

  async byStudent(studentId: string): Promise<Payment[]> {
    const rows = (await db
      .select()
      .from(payments)
      .where(eq(payments.studentId, studentId))
      .orderBy(desc(payments.paidAt))) as Payment[];
    return rows;
  },

  /** Every payment of a student (used on student delete). */
  async clearForStudent(studentId: string): Promise<void> {
    await db.delete(payments).where(eq(payments.studentId, studentId)).run();
  },

  /**
   * Compact payment rows (session-dues + dashboard aggregation): only the
   * columns the math reads, instead of the full table with notes.
   */
  async listCompact(): Promise<
    Array<Pick<Payment, "id" | "studentId" | "planId" | "amount" | "paidAt" | "period">>
  > {
    const rows = await db
      .select({
        id: payments.id,
        studentId: payments.studentId,
        planId: payments.planId,
        amount: payments.amount,
        paidAt: payments.paidAt,
        period: payments.period,
      })
      .from(payments);
    return rows as Array<Pick<Payment, "id" | "studentId" | "planId" | "amount" | "paidAt" | "period">>;
  },

  /**
   * History rows with names resolved in one query. LEFT joins preserve the
   * legacy fallbacks: missing student → "—", missing plan → null.
   */
  async listHistory(
    opts: PaymentHistoryFilters = {},
  ): Promise<Array<{ payment: Payment; studentName: string | null; planName: string | null }>> {
    const where = and(
      opts.studentId ? eq(payments.studentId, opts.studentId) : undefined,
      opts.period ? eq(payments.period, opts.period) : undefined,
    );
    const query = db
      .select({ payment: payments, studentName: students.name, planName: plans.name })
      .from(payments)
      .leftJoin(students, eq(payments.studentId, students.id))
      .leftJoin(plans, eq(payments.planId, plans.id))
      .where(where)
      .orderBy(desc(payments.paidAt));
    if (opts.limit !== undefined) query.limit(opts.limit);
    if (opts.offset !== undefined) query.offset(opts.offset);
    const rows = await query;
    return rows as Array<{ payment: Payment; studentName: string | null; planName: string | null }>;
  },

  /** Count matching history rows (same filters, ignores limit/offset). */
  async countHistory(opts: Omit<PaymentHistoryFilters, "limit" | "offset"> = {}): Promise<number> {
    const row = await db
      .select({ n: count() })
      .from(payments)
      .where(
        and(
          opts.studentId ? eq(payments.studentId, opts.studentId) : undefined,
          opts.period ? eq(payments.period, opts.period) : undefined,
        ),
      )
      .get();
    return (row as { n: number } | undefined)?.n ?? 0;
  },
};
