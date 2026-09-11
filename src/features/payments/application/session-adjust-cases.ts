import { studentRepository } from "@/features/students/infrastructure/student-repo";
import { paymentRepository } from "@/features/payments/infrastructure/payment-repo";
import { planRepository } from "@/features/payments/infrastructure/plan-repo";
import { attendanceRepository } from "@/features/attendance/infrastructure/attendance-repo";
import { uncoveredCount } from "./session-dues";
import { DEFAULT_SESSIONS_PER_CYCLE } from "@/lib/session-defaults";

export async function addSession(studentId: string): Promise<void> {
  const student = await studentRepository.findById(studentId);
  if (!student) throw new Error(`student ${studentId} not found`);
  const offset = Number(student.sessionOffset ?? 0) || 0;
  await studentRepository.update(studentId, { sessionOffset: offset + 1 });
}

export async function removeSession(studentId: string, opts?: { sessionsPerCycle: number }): Promise<void> {
  const student = await studentRepository.findById(studentId);
  if (!student) throw new Error(`student ${studentId} not found`);
  const offset = Number(student.sessionOffset ?? 0) || 0;
  const [payments, atts, plans] = await Promise.all([
    paymentRepository.byStudent(studentId),
    attendanceRepository.byStudent(studentId),
    planRepository.list(),
  ]);
  const sessionsPerCycle = opts?.sessionsPerCycle ?? DEFAULT_SESSIONS_PER_CYCLE;
  const plansById = new Map(plans.map((p) => [p.id, p]));
  const fallbackPlan = student.planId ? (plansById.get(student.planId) ?? null) : null;
  const effective = uncoveredCount(atts.length, payments, plansById, fallbackPlan, sessionsPerCycle, offset);
  if (effective <= 0) return;
  await studentRepository.update(studentId, { sessionOffset: offset - 1 });
}

export async function resetSessionOffset(studentId: string): Promise<void> {
  const student = await studentRepository.findById(studentId);
  if (!student) return;
  const offset = Number(student.sessionOffset ?? 0) || 0;
  if (offset !== 0) await studentRepository.update(studentId, { sessionOffset: 0 });
}
