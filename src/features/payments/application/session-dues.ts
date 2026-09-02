import type { Payment, Plan, Student } from "@/lib/db/schema";

export type SessionDuesStatus = "ok" | "warning" | "due";

export interface SessionDuesRow {
  student: Student;
  plan: Plan | null;
  /** الموضع داخل الدورة الحالية (0..S) — يُعرض كـ count */
  count: number;
  /** العدّ الخام منذ آخر دفع (قبل الـmodulo) — للحسابات والفرز */
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

function lastPayment(payments: Payment[]): Payment | null {
  if (payments.length === 0) return null;
  let best = payments[0];
  for (const p of payments) if (p.paidAt > best.paidAt) best = p;
  return best;
}

function toISODate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getLastPaidISO(payments: Payment[]): string | null {
  const last = lastPayment(payments);
  return last ? toISODate(last.paidAt) : null;
}

export function countSince(
  payments: Payment[],
  attendances: Array<{ date: string; createdAt?: number }>,
): number {
  const last = lastPayment(payments);
  if (!last) return attendances.length;
  let n = 0;
  const iso = toISODate(last.paidAt);
  for (const a of attendances) {
    if (a.date > iso) n++;
    else if (a.date === iso && a.createdAt != null && a.createdAt > last.paidAt) n++;
  }
  return n;
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
  paymentsByStudent: Map<string, Payment[]>,
  attendanceByStudent: Map<string, Array<{ date: string }>>,
  plansById: Map<string, Plan>,
  groupsByStudent: Map<string, Array<{ id: string; name: string }>>,
  sessionsPerCycle: number,
  warningAt: number,
): SessionDuesRow[] {
  const rows: SessionDuesRow[] = [];
  for (const student of students) {
    const payments = paymentsByStudent.get(student.id) ?? [];
    const attendances = attendanceByStudent.get(student.id) ?? [];
    const plan = student.planId ? (plansById.get(student.planId) ?? null) : null;
    // ponytail: manual offset per student (extra sessions counted toward the cycle).
    const offset = Number(student.sessionOffset ?? 0) || 0;
    const base = countSince(payments, attendances);
    const rawCount = Math.max(0, base + offset);
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
