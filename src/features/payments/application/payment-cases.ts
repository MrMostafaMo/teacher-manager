import { paymentInputSchema, type PaymentInput } from "@/features/payments/domain";
import { paymentRepository } from "@/features/payments/infrastructure/payment-repo";
import { planRepository } from "@/features/payments/infrastructure/plan-repo";
import { studentRepository } from "@/features/students/infrastructure/student-repo";
import { groupRepository } from "@/features/groups/infrastructure/group-repo";
import { logActivity } from "@/lib/activity-log";
import { enrolledBy, monthEnd } from "@/lib/utils/enrollment";
import type { Payment, Plan, Student } from "@/lib/db/schema";
import { uuid } from "@/lib/utils/uuid";
import {
  studentStatement,
  type StatementMonth,
  type StatementPayment,
  type StudentStatement,
} from "./payment-statement";

export { studentStatement };
export type { StatementMonth, StatementPayment, StudentStatement };

/**
 * Payments use-cases. Validate input, write through the repository, and
 * record each mutation in the activity log. Monthly dues are computed here
 * from active students, their assigned plan, and the period's payments.
 */

export async function recordPayment(input: PaymentInput): Promise<Payment> {
  const parsed = paymentInputSchema.parse(input);
  const row = await paymentRepository.insert({ id: uuid(), ...parsed, paidAt: Date.now() });
  await logActivity({
    action: "payment.create",
    entityType: "payment",
    entityId: row.id,
    details: { studentId: row.studentId, amount: row.amount, period: row.period },
  });
  return row;
}

export async function deletePayment(id: string): Promise<void> {
  const removed = await paymentRepository.remove(id);
  if (!removed) throw new Error(`payment ${id} not found`);
  await logActivity({ action: "payment.delete", entityType: "payment", entityId: id });
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

export async function monthlyDues(period: string): Promise<DuesRow[]> {
  const [activeStudents, plans, payments, memberships] = await Promise.all([
    studentRepository.search({ status: "active" }),
    planRepository.list(),
    paymentRepository.byPeriod(period),
    groupRepository.memberships(),
  ]);
  // A student is billed from their enrollment month onward — never before it.
  const students = activeStudents.filter((s) => enrolledBy(s, monthEnd(period)));
  const planById = new Map(plans.map((p) => [p.id, p]));
  const groupsByStudent = new Map<string, Array<{ id: string; name: string }>>();
  for (const m of memberships) {
    const arr = groupsByStudent.get(m.studentId) ?? [];
    arr.push({ id: m.groupId, name: m.groupName });
    groupsByStudent.set(m.studentId, arr);
  }
  const paidByStudent = new Map<string, number>();
  for (const p of payments) {
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

export interface PaymentHistoryRow {
  payment: Payment;
  studentName: string;
  planName: string | null;
}

export async function listPaymentHistory(options?: {
  studentId?: string;
  limit?: number;
}): Promise<PaymentHistoryRow[]> {
  const payments = options?.studentId
    ? await paymentRepository.byStudent(options.studentId)
    : await paymentRepository.list({ newestFirst: true, limit: options?.limit });
  if (payments.length === 0) return [];
  const [students, plans] = await Promise.all([
    studentRepository.list(),
    planRepository.list(),
  ]);
  const studentById = new Map(students.map((s) => [s.id, s]));
  const planById = new Map(plans.map((p) => [p.id, p]));
  return payments.map((p) => ({
    payment: p,
    studentName: studentById.get(p.studentId)?.name ?? "—",
    planName: p.planId ? (planById.get(p.planId)?.name ?? null) : null,
  }));
}
