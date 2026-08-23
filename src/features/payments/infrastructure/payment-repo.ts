import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { payments, type Payment } from "@/lib/db/schema";
import { createRepository } from "@/lib/db/repository";

/**
 * Payments repository: generic CRUD plus period/student queries. The
 * student names for the history view are resolved in the application layer.
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
};
