import { studentRepository } from "@/features/students/infrastructure/student-repo";
import { paymentRepository } from "@/features/payments/infrastructure/payment-repo";
import { attendanceRepository } from "@/features/attendance/infrastructure/attendance-repo";
import { countSince } from "./session-dues";

export async function addSession(studentId: string): Promise<void> {
  const student = await studentRepository.findById(studentId);
  if (!student) throw new Error(`student ${studentId} not found`);
  const offset = Number((student as unknown as { sessionOffset?: number }).sessionOffset ?? 0) || 0;
  await studentRepository.update(studentId, { sessionOffset: offset + 1 } as unknown as Record<string, unknown>);
}

export async function removeSession(studentId: string): Promise<void> {
  const student = await studentRepository.findById(studentId);
  if (!student) throw new Error(`student ${studentId} not found`);
  const offset = Number((student as unknown as { sessionOffset?: number }).sessionOffset ?? 0) || 0;
  const [payments, atts] = await Promise.all([
    paymentRepository.byStudent(studentId),
    attendanceRepository.byStudent(studentId),
  ]);
  const base = countSince(
    payments,
    atts.map((a) => ({ date: a.date })),
  );
  const effective = Math.max(0, base + offset);
  if (effective <= 0) return;
  await studentRepository.update(studentId, { sessionOffset: offset - 1 } as unknown as Record<string, unknown>);
}

export async function resetSessionOffset(studentId: string): Promise<void> {
  const student = await studentRepository.findById(studentId);
  if (!student) return;
  const offset = Number((student as unknown as { sessionOffset?: number }).sessionOffset ?? 0) || 0;
  if (offset !== 0) await studentRepository.update(studentId, { sessionOffset: 0 } as unknown as Record<string, unknown>);
}
