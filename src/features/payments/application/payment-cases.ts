import { paymentInputSchema, type PaymentInput } from "@/features/payments/domain";
import { paymentRepository } from "@/features/payments/infrastructure/payment-repo";
import { planRepository } from "@/features/payments/infrastructure/plan-repo";
import { studentRepository } from "@/features/students/infrastructure/student-repo";
import { groupRepository } from "@/features/groups/infrastructure/group-repo";
import { logActivity } from "@/lib/activity-log";
import { enrolledBy, monthEnd } from "@/lib/utils/enrollment";
import type { Payment, Plan, Student } from "@/lib/db/schema";
import { uuid } from "@/lib/utils/uuid";
import dayjs from "dayjs";

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

export interface StatementMonth {
  /** Billed period as YYYY-MM. */
  period: string;
  due: number;
  paid: number;
  /** due - paid for this month. */
  balance: number;
  /** Cumulative balance across months; negative means a credit/advance. */
  running: number;
}

export interface StatementPayment {
  payment: Payment;
  /** Sum of all payments up to and including this one. */
  cumulativePaid: number;
}

export interface StudentStatement {
  student: Student;
  planName: string | null;
  months: StatementMonth[];
  payments: StatementPayment[];
  totalDue: number;
  totalPaid: number;
  totalBalance: number;
}

/**
 * Statement of account for one student: one row per month from the month they
 * enrolled (or first paid) through today, each charging the current plan
 * amount and crediting that month's payments, plus a chronological payment
 * ledger with the running balance. A negative running/total means the student
 * is paid ahead (advance/credit).
 */
export async function studentStatement(studentId: string): Promise<StudentStatement> {
  const [student, plans, allPayments] = await Promise.all([
    studentRepository.findById(studentId),
    planRepository.list(),
    paymentRepository.byStudent(studentId),
  ]);
  if (!student) throw new Error(`student ${studentId} not found`);
  const plan = student.planId ? plans.find((p) => p.id === student.planId) : null;
  const duePerMonth = plan?.amount ?? 0;

  const sorted = [...allPayments].sort((a, b) => a.paidAt - b.paidAt);
  const paidByPeriod = new Map<string, number>();
  for (const p of sorted) {
    if (!p.period) continue;
    paidByPeriod.set(p.period, (paidByPeriod.get(p.period) ?? 0) + p.amount);
  }

  const today = dayjs().format("YYYY-MM");
  const firstPaidPeriod = sorted.find((p) => p.period)?.period;
  const firstPeriod = student.enrolledOn?.slice(0, 7) ?? firstPaidPeriod ?? today;
  const lastPaidPeriod = [...sorted].reverse().find((p) => p.period)?.period;
  const endPeriod = lastPaidPeriod && lastPaidPeriod > today ? lastPaidPeriod : today;

  const months: StatementMonth[] = [];
  let running = 0;
  for (
    let cur = firstPeriod;
    cur <= endPeriod;
    cur = dayjs(`${cur}-01`).add(1, "month").format("YYYY-MM")
  ) {
    const due = duePerMonth;
    const paid = paidByPeriod.get(cur) ?? 0;
    running += due - paid;
    months.push({ period: cur, due, paid, balance: due - paid, running });
  }

  let cumulative = 0;
  const payments = sorted.map((p) => {
    cumulative += p.amount;
    return { payment: p, cumulativePaid: cumulative };
  });

  const totalDue = months.reduce((a, m) => a + m.due, 0);
  const totalPaid = sorted.reduce((a, p) => a + p.amount, 0);

  return {
    student,
    planName: plan?.name ?? null,
    months,
    payments,
    totalDue,
    totalPaid,
    totalBalance: totalDue - totalPaid,
  };
}
