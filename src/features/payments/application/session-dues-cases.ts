import { studentRepository } from "@/features/students/infrastructure/student-repo";
import { planRepository } from "@/features/payments/infrastructure/plan-repo";
import { paymentRepository } from "@/features/payments/infrastructure/payment-repo";
import { groupRepository } from "@/features/groups/infrastructure/group-repo";
import { attendanceRepository } from "@/features/attendance/infrastructure/attendance-repo";
import { enrolledBy, monthEnd } from "@/lib/utils/enrollment";
import { DEFAULT_SESSIONS_PER_CYCLE, DEFAULT_WARNING_AT } from "@/lib/session-defaults";
import type { Payment, Plan, Student } from "@/lib/db/schema";
import dayjs from "dayjs";
import { buildSessionDues, type SessionDuesRow } from "./session-dues";

export type { SessionDuesRow };

export interface SessionDuesOpts {
  sessionsPerCycle: number;
  warningAt: number;
}

export interface SessionDuesDims {
  activeStudents: Student[];
  plans: Plan[];
  payments: Array<Pick<Payment, "id" | "studentId" | "planId" | "amount" | "paidAt" | "period">>;
  attendanceCounts: Array<{ studentId: string; n: number }>;
  memberships: Array<{ studentId: string; groupId: string; groupName: string }>;
}

export async function sessionDues(
  opts?: SessionDuesOpts,
  dims?: SessionDuesDims,
): Promise<SessionDuesRow[]> {
  // Callers (UI) read the store and pass opts; tests inject directly.
  // Defaults mirror the store defaults so the case stays store-free.
  const sessionsPerCycle = opts?.sessionsPerCycle ?? DEFAULT_SESSIONS_PER_CYCLE;
  const warningAt = opts?.warningAt ?? DEFAULT_WARNING_AT;
  const today = dayjs().format("YYYY-MM-DD");
  const month = today.slice(0, 7);
  const [activeStudents, plans, payments, attendanceCounts, memberships] = dims
    ? [dims.activeStudents, dims.plans, dims.payments, dims.attendanceCounts, dims.memberships]
    : await Promise.all([
        studentRepository.search({ status: "active" }),
        planRepository.list(),
        paymentRepository.listCompact(),
        attendanceRepository.countsByStudent(),
        groupRepository.memberships(),
      ]);
  const students = activeStudents.filter(
    (s) => !s.isExempt && enrolledBy(s, monthEnd(month)),
  );
  const plansById = new Map(plans.map((p) => [p.id, p]));
  const paymentsByStudent = new Map<string, typeof payments>();
  for (const p of payments) {
    const arr = paymentsByStudent.get(p.studentId) ?? [];
    arr.push(p);
    paymentsByStudent.set(p.studentId, arr);
  }
  // Counted days per student (present/late/absent, deduped by date).
  const attendanceByStudent = new Map(attendanceCounts.map((c) => [c.studentId, c.n]));
  const groupsByStudent = new Map<string, Array<{ id: string; name: string }>>();
  for (const m of memberships) {
    const arr = groupsByStudent.get(m.studentId) ?? [];
    arr.push({ id: m.groupId, name: m.groupName });
    groupsByStudent.set(m.studentId, arr);
  }
  return buildSessionDues(
    students,
    paymentsByStudent,
    attendanceByStudent,
    plansById,
    groupsByStudent,
    sessionsPerCycle,
    warningAt,
  );
}
