import type { Payment, Plan, Student } from "@/lib/db/schema";

export type SessionDuesStatus = "ok" | "warning" | "due";

export interface SessionDuesRow {
  student: Student;
  plan: Plan | null;
  count: number;
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
  attendances: Array<{ date: string }>,
): number {
  const iso = getLastPaidISO(payments);
  if (!iso) return attendances.length;
  let n = 0;
  for (const a of attendances) if (a.date > iso) n++;
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
    const count = countSince(payments, attendances);
    const status = statusForCount(count, sessionsPerCycle, warningAt);
    const price = pricePerSession(plan, sessionsPerCycle);
    const remainingSessions = Math.max(0, sessionsPerCycle - count);
    const last = lastPayment(payments);
    rows.push({
      student,
      plan,
      count,
      status,
      remainingSessions,
      pricePerSession: price,
      remainingAmount: price != null ? remainingSessions * price : null,
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
    if (b.count !== a.count) return b.count - a.count;
    return a.student.name.localeCompare(b.student.name);
  });
  return rows;
}
