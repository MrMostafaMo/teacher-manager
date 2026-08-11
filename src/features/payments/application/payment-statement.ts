import { paymentRepository } from "@/features/payments/infrastructure/payment-repo";
import { planRepository } from "@/features/payments/infrastructure/plan-repo";
import { studentRepository } from "@/features/students/infrastructure/student-repo";
import type { Payment, Student } from "@/lib/db/schema";
import dayjs from "dayjs";

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
