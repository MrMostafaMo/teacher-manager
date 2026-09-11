import type { Payment, Plan, Student } from "@/lib/db/schema";

/** Minimal payment shape the cycle math reads (projections welcome). */
export type SessionPayment = Pick<Payment, "amount" | "planId" | "paidAt">;

export type SessionDuesStatus = "ok" | "warning" | "due";

export interface SessionDuesRow {
  student: Student;
  plan: Plan | null;
  /** الموضع داخل الدورة الحالية (0..S) — يُعرض كـ count */
  count: number;
  /** العدّ الخام غير المغطى بالدفع (قبل الـmodulo) — للحسابات والفرز */
  rawCount: number;
  /** عدد الدورات المكتملة بلا دفع */
  cyclesOverdue: number;
  /** true عندما rawCount >= S (حتى لو display == 1 بعد اللف) */
  isOverdue: boolean;
  /** true عندما raw==0 لكن يوجد دفع سابق → نعرض S/ S مع شارة "تم الدفع" حتى أول حضور جديد */
  showPaid: boolean;
  status: SessionDuesStatus;
  remainingSessions: number;
  pricePerSession: number | null;
  remainingAmount: number | null;
  fullCycleAmount: number | null;
  lastPaidISO: string | null;
  lastPaidAmount: number | null;
  groups: Array<{ id: string; name: string }>;
}

function lastPayment(payments: SessionPayment[]): SessionPayment | null {
  if (payments.length === 0) return null;
  let best = payments[0];
  for (const p of payments) if (p.paidAt > best.paidAt) best = p;
  return best;
}

function toISODate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getLastPaidISO(payments: SessionPayment[]): string | null {
  const last = lastPayment(payments);
  return last ? toISODate(last.paidAt) : null;
}

function normCycle(n: number): number {
  const S = Number(n);
  return Number.isFinite(S) && S > 0 ? Math.floor(S) : 8;
}
/** حصص الدفعة = المبلغ ÷ سعر الحصة (مقرّب)؛ وبدون خطة = دورة كاملة. */
export function sessionsCoveredByPayment(
  payment: Pick<Payment, "amount" | "planId">,
  plan: Plan | null,
  sessionsPerCycle: number,
): number {
  const S = normCycle(sessionsPerCycle);
  if (plan && Number.isFinite(plan.amount) && plan.amount > 0) {
    return Math.max(0, Math.round((Number(payment.amount) || 0) * S / plan.amount));
  }
  return S;
}
export function paidSessionsTotal(
  payments: SessionPayment[],
  plansById: Map<string, Plan>,
  fallbackPlan: Plan | null,
  sessionsPerCycle: number,
): number {
  let total = 0;
  for (const p of payments) {
    total += sessionsCoveredByPayment(p, p.planId ? (plansById.get(p.planId) ?? fallbackPlan) : fallbackPlan, sessionsPerCycle);
  }
  return total;
}
/** raw = T - min(floor(T/S)*S, P): المتأخر يُكمل (10-8=2)، والمبكر يحفظ (3→3). */
export function uncoveredCount(
  totalAttendances: number,
  payments: SessionPayment[],
  plansById: Map<string, Plan>,
  fallbackPlan: Plan | null,
  sessionsPerCycle: number,
  offset = 0,
): number {
  const T = Math.max(0, (Number(totalAttendances) || 0) + (Number(offset) || 0));
  if (T === 0) return 0;
  const S = normCycle(sessionsPerCycle);
  const completed = Math.floor(T / S) * S;
  if (completed <= 0 || payments.length === 0) return T;
  return T - Math.min(completed, Math.max(0, paidSessionsTotal(payments, plansById, fallbackPlan, S)));
}

export function pricePerSession(plan: Plan | null, sessionsPerCycle: number): number | null {
  if (!plan || !Number.isFinite(sessionsPerCycle) || sessionsPerCycle <= 0) return null;
  return Math.round(plan.amount / sessionsPerCycle);
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

export function deriveCycle(
  rawCount: number,
  sessionsPerCycle: number,
  warningAt: number,
  hasPaid = false,
): { displayCount: number; remainingSessions: number; cyclesOverdue: number; isOverdue: boolean; showPaid: boolean; status: SessionDuesStatus } {
  const S = Number.isFinite(sessionsPerCycle) ? sessionsPerCycle : 8;
  const W = Number.isFinite(warningAt) ? warningAt : S - 2;
  const raw = Math.max(0, Number(rawCount) || 0);
  if (S <= 0) return { displayCount: raw, remainingSessions: 0, cyclesOverdue: 0, isOverdue: false, showPaid: false, status: "ok" };
  // بعد الدفع و raw==0 نظهر 8/8 مع شارة "تم الدفع" حتى أول حضور جديد (يقلب 1/8 وتختفي الشارة)
  if (raw === 0 && hasPaid) {
    return { displayCount: S, remainingSessions: 0, cyclesOverdue: 0, isOverdue: false, showPaid: true, status: "ok" };
  }
  const cyclesOverdue = Math.floor(raw / S);
  const isOverdue = cyclesOverdue > 0;
  const rem = raw % S;
  const displayCount = raw === 0 ? 0 : rem === 0 ? S : rem;
  const remainingSessions = raw === 0 ? S : rem === 0 ? 0 : S - rem;
  const baseStatus = statusForCount(displayCount, S, W);
  const status: SessionDuesStatus = isOverdue ? "due" : baseStatus;
  return { displayCount, remainingSessions, cyclesOverdue, isOverdue, showPaid: false, status };
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
    const totalAttendances = attendanceCounts.get(student.id) ?? 0;
    const plan = student.planId ? (plansById.get(student.planId) ?? null) : null;
    // ponytail: manual offset per student (extra sessions counted toward the cycle).
    const offset = Number(student.sessionOffset ?? 0) || 0;
    const rawCount = uncoveredCount(
      totalAttendances,
      payments,
      plansById,
      plan,
      sessionsPerCycle,
      offset,
    );
    const hasPaid = payments.length > 0;
    const derived = deriveCycle(rawCount, sessionsPerCycle, warningAt, hasPaid);
    const price = pricePerSession(plan, sessionsPerCycle);
    const last = lastPayment(payments);
    rows.push({
      student,
      plan,
      count: derived.displayCount,
      rawCount,
      cyclesOverdue: derived.cyclesOverdue,
      isOverdue: derived.isOverdue,
      showPaid: derived.showPaid,
      status: derived.status,
      remainingSessions: derived.remainingSessions,
      pricePerSession: price,
      remainingAmount: price != null ? derived.remainingSessions * price : null,
      fullCycleAmount: plan ? plan.amount : null,
      lastPaidISO: last ? toISODate(last.paidAt) : null,
      lastPaidAmount: last ? last.amount : null,
      groups: groupsByStudent.get(student.id) ?? [],
    });
  }
  rows.sort((a, b) => {
    const order = { due: 0, warning: 1, ok: 2 } as const;
    const d = order[a.status] - order[b.status];
    if (d !== 0) return d;
    if ((b.cyclesOverdue ?? 0) !== (a.cyclesOverdue ?? 0)) return (b.cyclesOverdue ?? 0) - (a.cyclesOverdue ?? 0);
    if ((b.rawCount ?? b.count) !== (a.rawCount ?? a.count)) return (b.rawCount ?? b.count) - (a.rawCount ?? a.count);
    return a.student.name.localeCompare(b.student.name);
  });
  return rows;
}
