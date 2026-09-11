import { paymentInputSchema, type PaymentInput } from "@/features/payments/domain";
import { paymentRepository } from "@/features/payments/infrastructure/payment-repo";
import { planRepository } from "@/features/payments/infrastructure/plan-repo";
import { studentRepository } from "@/features/students/infrastructure/student-repo";
import { groupRepository } from "@/features/groups/infrastructure/group-repo";
import { logActivity } from "@/lib/activity-log";
import { enrolledBy, monthEnd } from "@/lib/utils/enrollment";
import { payments, type Payment, type Plan, type Student } from "@/lib/db/schema";
import { captureRows, restoreRows } from "@/lib/db/snapshot";
import { registerUndo } from "@/lib/undo-store";
import { uuid } from "@/lib/utils/uuid";
import {
  studentStatement,
  type StatementBillingOpts,
  type StatementMonth,
  type StatementPayment,
  type StudentStatement,
} from "./payment-statement";

export { studentStatement };
export type { StatementBillingOpts, StatementMonth, StatementPayment, StudentStatement };

/**
 * Payments use-cases. Validate input, write through the repository, and
 * record each mutation in the activity log. Monthly dues are computed here
 * from active students, their assigned plan, and the period's payments.
 */

export async function recordPayment(input: PaymentInput): Promise<Payment> {
  const parsed = paymentInputSchema.parse(input);
  const row = await paymentRepository.insert({ id: uuid(), ...parsed, paidAt: Date.now() });
  // ponytail: session counter is pure (carry-over in session-dues.ts) — no reset on payment.
  await logActivity({
    action: "payment.create",
    entityType: "payment",
    entityId: row.id,
    details: { studentId: row.studentId, amount: row.amount, period: row.period },
  });
  return row;
}

export async function deletePayment(
  id: string,
  options: { undo?: boolean } = {},
): Promise<number | null> {
  const rows = options.undo === false ? [] : await captureRows(payments, [id]);
  const removed = await paymentRepository.remove(id);
  if (!removed) throw new Error(`payment ${id} not found`);
  await logActivity({ action: "payment.delete", entityType: "payment", entityId: id });
  if (options.undo === false) return null;
  return registerUndo(() => restoreRows(payments, rows));
}

export async function updatePayment(id: string, input: PaymentInput): Promise<Payment> {
  const parsed = paymentInputSchema.parse(input);
  const row = await paymentRepository.update(id, parsed);
  if (!row) throw new Error(`payment ${id} not found`);
  await logActivity({
    action: "payment.update",
    entityType: "payment",
    entityId: id,
    details: { studentId: row.studentId, amount: row.amount, period: row.period },
  });
  return row;
}

export interface DuesRow {
  student: Student;
  plan: Plan | null;
  due: number;
  paid: number;
  remaining: number;
  groups: Array<{ id: string; name: string }>;
}

export interface DuesDimensions {
  activeStudents: Student[];
  plans: Plan[];
  payments: Array<Pick<Payment, "studentId" | "amount">>;
  memberships: Array<{ studentId: string; groupId: string; groupName: string }>;
}

/** Pure dues math over preloaded dimensions (shared by the page + dashboard). */
export function computeMonthlyDues(period: string, dims: DuesDimensions): DuesRow[] {
  // A student is billed from their enrollment month onward — never before it.
  const students = dims.activeStudents.filter(
    (s) => !s.isExempt && enrolledBy(s, monthEnd(period)),
  );
  const planById = new Map(dims.plans.map((p) => [p.id, p]));
  const groupsByStudent = new Map<string, Array<{ id: string; name: string }>>();
  for (const m of dims.memberships) {
    const arr = groupsByStudent.get(m.studentId) ?? [];
    arr.push({ id: m.groupId, name: m.groupName });
    groupsByStudent.set(m.studentId, arr);
  }
  const paidByStudent = new Map<string, number>();
  for (const p of dims.payments) {
    paidByStudent.set(p.studentId, (paidByStudent.get(p.studentId) ?? 0) + p.amount);
  }
  return students.map((student) => {
    const plan = student.planId ? (planById.get(student.planId) ?? null) : null;
    const due = plan?.amount ?? 0;
    const paid = paidByStudent.get(student.id) ?? 0;
    return {
      student,
      plan,
      due,
      paid,
      remaining: due - paid,
      groups: groupsByStudent.get(student.id) ?? [],
    };
  });
}

export async function monthlyDues(period: string): Promise<DuesRow[]> {
  const [activeStudents, plans, payments, memberships] = await Promise.all([
    studentRepository.search({ status: "active" }),
    planRepository.list(),
    paymentRepository.byPeriod(period),
    groupRepository.memberships(),
  ]);
  return computeMonthlyDues(period, { activeStudents, plans, payments, memberships });
}

export interface PaymentHistoryRow {
  payment: Payment;
  studentName: string;
  planName: string | null;
}

export async function listPaymentHistory(options?: {
  studentId?: string;
  period?: string;
  limit?: number;
  offset?: number;
}): Promise<PaymentHistoryRow[]> {
  const rows = await paymentRepository.listHistory({
    studentId: options?.studentId,
    period: options?.period,
    limit: options?.limit,
    offset: options?.offset,
  });
  return rows.map((r) => ({
    payment: r.payment,
    studentName: r.studentName ?? "—",
    planName: r.planName ?? null,
  }));
}

export function countPaymentHistory(options?: {
  studentId?: string;
  period?: string;
}): Promise<number> {
  return paymentRepository.countHistory({ studentId: options?.studentId, period: options?.period });
}
