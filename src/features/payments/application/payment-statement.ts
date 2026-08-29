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

/** The months a statement spans: enrollment (or first paid) through today. */
export function statementPeriods(
  student: Student,
  payments: Payment[],
  todayIso: string,
): { firstPeriod: string; endPeriod: string } {
  const sorted = [...payments].sort((a, b) => a.paidAt - b.paidAt);
  const firstPaidPeriod = sorted.find((p) => p.period)?.period;
  const firstPeriod = student.enrolledOn?.slice(0, 7) ?? firstPaidPeriod ?? todayIso;
  const lastPaidPeriod = [...sorted].reverse().find((p) => p.period)?.period;
  const endPeriod = lastPaidPeriod && lastPaidPeriod > todayIso ? lastPaidPeriod : todayIso;
  return { firstPeriod, endPeriod };
}

/**
 * Pure statement math: one row per month from `firstPeriod` to `endPeriod`,
 * charging `duePerMonth` and crediting each month's payments, plus the
 * chronological ledger. A negative running/total means paid ahead (credit).
 */
export function computeStatement(
  duePerMonth: number,
  payments: Payment[],
  firstPeriod: string,
  endPeriod: string,
): {
  months: StatementMonth[];
  payments: StatementPayment[];
  totalDue: number;
  totalPaid: number;
  totalBalance: number;
} {
  const sorted = [...payments].sort((a, b) => a.paidAt - b.paidAt);
  const paidByPeriod = new Map<string, number>();
  for (const p of sorted) {
    if (!p.period) continue;
    paidByPeriod.set(p.period, (paidByPeriod.get(p.period) ?? 0) + p.amount);
  }

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
  const ledger = sorted.map((p) => {
    cumulative += p.amount;
    return { payment: p, cumulativePaid: cumulative };
  });

  const totalDue = months.reduce((a, m) => a + m.due, 0);
  const totalPaid = sorted.reduce((a, p) => a + p.amount, 0);

  return { months, payments: ledger, totalDue, totalPaid, totalBalance: totalDue - totalPaid };
}

/**
 * Statement of account for one student: one row per month from the month they
 * enrolled (or first paid) through today, each charging the current plan
 * amount and crediting that month's payments, plus a chronological payment
 * ledger with the running balance. A negative running/total means the student
 * is paid ahead (advance/credit).
 *
 * ponytail: charges today's plan price for every past month. If a plan price
 * changes, history is rewritten. Snapshot dueAmount at payment time or add
 * plan_amount_history when this matters.
 */
import { useSessionSettings } from "@/lib/session-settings-store";
import { attendanceRepository } from "@/features/attendance/infrastructure/attendance-repo";

export async function studentStatement(studentId: string): Promise<StudentStatement> {
  const [student, plans, allPayments, allAttendances] = await Promise.all([
    studentRepository.findById(studentId),
    planRepository.list(),
    paymentRepository.byStudent(studentId),
    attendanceRepository.byStudent(studentId),
  ]);
  if (!student) throw new Error(`student ${studentId} not found`);
  const plan = student.planId ? plans.find((p) => p.id === student.planId) : null;
  const duePerMonth = plan?.amount ?? 0;

  const { billingMode, sessionsPerCycle } = useSessionSettings.getState();

  let months: StatementMonth[] = [];
  let ledger: StatementPayment[] = [];
  let totalDue = 0;
  let totalPaid = 0;
  let totalBalance = 0;

  if (billingMode === "sessions") {
    // Session billing: charge `duePerMonth` for every `sessionsPerCycle` attendances.
    const sortedPayments = [...allPayments].sort((a, b) => a.paidAt - b.paidAt);
    totalPaid = sortedPayments.reduce((a, p) => a + p.amount, 0);

    let cumulative = 0;
    ledger = sortedPayments.map((p) => {
      cumulative += p.amount;
      return { payment: p, cumulativePaid: cumulative };
    });

    const attendances = [...allAttendances].sort((a, b) => a.date.localeCompare(b.date));
    let running = 0;
    const totalCycles = Math.ceil(Math.max(1, attendances.length) / sessionsPerCycle);
    totalDue = totalCycles * duePerMonth;
    totalBalance = totalDue - totalPaid;

    let paidRemaining = totalPaid;
    for (let i = 1; i <= totalCycles; i++) {
      const due = duePerMonth;
      const paid = Math.min(paidRemaining, due);
      paidRemaining -= paid;
      running += due - paid;
      months.push({
        period: `دورة ${i}`,
        due,
        paid,
        balance: due - paid,
        running
      });
    }
  } else {
    const { firstPeriod, endPeriod } = statementPeriods(
      student,
      allPayments,
      dayjs().format("YYYY-MM"),
    );
    const math = computeStatement(
      duePerMonth,
      allPayments,
      firstPeriod,
      endPeriod,
    );
    months = math.months;
    ledger = math.payments;
    totalDue = math.totalDue;
    totalPaid = math.totalPaid;
    totalBalance = math.totalBalance;
  }

  return {
    student,
    planName: plan?.name ?? null,
    months,
    payments: ledger,
    totalDue,
    totalPaid,
    totalBalance,
  };
}
