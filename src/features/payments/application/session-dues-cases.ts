import { studentRepository } from "@/features/students/infrastructure/student-repo";
import { planRepository } from "@/features/payments/infrastructure/plan-repo";
import { paymentRepository } from "@/features/payments/infrastructure/payment-repo";
import { groupRepository } from "@/features/groups/infrastructure/group-repo";
import { attendanceRepository } from "@/features/attendance/infrastructure/attendance-repo";
import { enrolledBy, monthEnd } from "@/lib/utils/enrollment";
import { useSessionSettings } from "@/lib/session-settings-store";
import dayjs from "dayjs";
import { buildSessionDues, type SessionDuesRow } from "./session-dues";

export type { SessionDuesRow };

export async function sessionDues(): Promise<SessionDuesRow[]> {
  const { sessionsPerCycle, warningAt } = useSessionSettings.getState();
  const today = dayjs().format("YYYY-MM-DD");
  const month = today.slice(0, 7);
  const [activeStudents, plans, payments, attendances, memberships] = await Promise.all([
    studentRepository.search({ status: "active" }),
    planRepository.list(),
    paymentRepository.list(),
    attendanceRepository.list(),
    groupRepository.memberships(),
  ]);
  const students = activeStudents.filter(
    (s) => !((s as unknown as { isExempt?: boolean }).isExempt) && enrolledBy(s, monthEnd(month)),
  );
  const plansById = new Map(plans.map((p) => [p.id, p]));
  const paymentsByStudent = new Map<string, typeof payments>();
  for (const p of payments) {
    const arr = paymentsByStudent.get(p.studentId) ?? [];
    arr.push(p);
    paymentsByStudent.set(p.studentId, arr);
  }
  const attendanceByStudent = new Map<string, Array<{ date: string }>>();
  for (const a of attendances) {
    const arr = attendanceByStudent.get(a.studentId) ?? [];
    arr.push({ date: a.date });
    attendanceByStudent.set(a.studentId, arr);
  }
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
