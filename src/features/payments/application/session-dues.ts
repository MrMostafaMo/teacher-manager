import type { Payment, Plan, Student } from "@/lib/db/schema";

/** Minimal payment shape the cycle math reads (projections welcome). */
export type SessionPayment = Pick<Payment, "amount" | "planId">;

export type SessionDuesStatus = "ok" | "warning" | "due";

export interface SessionDuesRow {
  student: Student;
  plan: Plan | null;
  /** أيام الحضور المحتسبة (حاضر+متأخر+غائب، بلا تكرار لليوم) — العداد الخام */
  total: number;
  /** الموضع داخل الدورة الحالية (0 عندما total=0، وإلا 1..S) — يُعرض كـ count */
  count: number;
  /** رقم الدورة الحالية (1-based): كل S حصص = شهر/دورة */
  cycleNumber: number;
  /** المتبقي لإتمام الدورة (S عندما total=0) */
  remainingSessions: number;
  status: SessionDuesStatus;
  /** عدد الدورات المدفوعة (مجموع المبالغ ÷ مبلغ الخطة) */
  paidCycles: number;
  /** شارة الدفع للدورة الحالية — لا تمس العداد إطلاقًا */
  isPaid: boolean;
  groups: Array<{ id: string; name: string }>;
}

function normCycle(n: number): number {
  const S = Number(n);
  return Number.isFinite(S) && S > 0 ? Math.floor(S) : 8;
}

/** العداد الخالص: total=0 → ‏0/S، وإلا دورة modulo ‏(8→8/8، 9→1/8، 16→8/8، 17→1/8). */
export function cycleOf(
  totalAttendances: number,
  sessionsPerCycle: number,
): { count: number; cycleNumber: number; remainingSessions: number } {
  const S = normCycle(sessionsPerCycle);
  const total = Math.max(0, Number(totalAttendances) || 0);
  if (total === 0) return { count: 0, cycleNumber: 1, remainingSessions: S };
  const cycleNumber = Math.floor((total - 1) / S) + 1;
  const count = total - (cycleNumber - 1) * S;
  return { count, cycleNumber, remainingSessions: S - count };
}

export function statusForCount(
  count: number,
  sessionsPerCycle: number,
  warningAt: number,
): SessionDuesStatus {
  const c = Number(count) || 0;
  const S = Number.isFinite(sessionsPerCycle) ? sessionsPerCycle : 8;
  const W = Number.isFinite(warningAt) ? warningAt : S - 2;
  if (c >= S) return "due";
  if (c >= W) return "warning";
  return "ok";
}

/** الدورات المدفوعة: مجموع المبالغ ÷ مبلغ الخطة (مُرضية لأسفل)؛ وبلا خطة = دفعة واحدة لكل دورة. */
export function paidCyclesFor(payments: SessionPayment[], plan: Plan | null): number {
  if (payments.length === 0) return 0;
  if (plan && Number.isFinite(plan.amount) && plan.amount > 0) {
    const sum = payments.reduce((a, p) => a + (Number(p.amount) || 0), 0);
    return Math.max(0, Math.floor(sum / plan.amount));
  }
  return payments.length;
}

export function buildSessionDues(
  students: Student[],
  paymentsByStudent: Map<string, SessionPayment[]>,
  attendanceCounts: Map<string, number>,
  plansById: Map<string, Plan>,
  groupsByStudent: Map<string, Array<{ id: string; name: string }>>,
  sessionsPerCycle: number,
  warningAt: number,
): SessionDuesRow[] {
  const rows: SessionDuesRow[] = [];
  for (const student of students) {
    const payments = paymentsByStudent.get(student.id) ?? [];
    const total = attendanceCounts.get(student.id) ?? 0;
    const plan = student.planId ? (plansById.get(student.planId) ?? null) : null;
    const cycle = cycleOf(total, sessionsPerCycle);
    const paidCycles = paidCyclesFor(payments, plan);
    rows.push({
      student,
      plan,
      total,
      count: cycle.count,
      cycleNumber: cycle.cycleNumber,
      remainingSessions: cycle.remainingSessions,
      status: statusForCount(cycle.count, sessionsPerCycle, warningAt),
      paidCycles,
      isPaid: paidCycles >= cycle.cycleNumber,
      groups: groupsByStudent.get(student.id) ?? [],
    });
  }
  rows.sort((a, b) => {
    const order = { due: 0, warning: 1, ok: 2 } as const;
    const d = order[a.status] - order[b.status];
    if (d !== 0) return d;
    if (Number(a.isPaid) !== Number(b.isPaid)) return Number(a.isPaid) - Number(b.isPaid);
    if (b.total !== a.total) return b.total - a.total;
    return a.student.name.localeCompare(b.student.name);
  });
  return rows;
}
