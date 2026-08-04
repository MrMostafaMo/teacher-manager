import { studentInputSchema, type StudentInput } from "@/features/students/domain";
import { studentRepository, type StudentFilters } from "@/features/students/infrastructure/student-repo";
import { skillRepository } from "@/features/skills/infrastructure/skill-repo";
import { attendanceRepository } from "@/features/attendance/infrastructure/attendance-repo";
import { paymentRepository } from "@/features/payments/infrastructure/payment-repo";
import { groupRepository } from "@/features/groups/infrastructure/group-repo";
import { homeworkRepository } from "@/features/homework/infrastructure/homework-repo";
import { examRepository } from "@/features/exams/infrastructure/exam-repo";
import { logActivity } from "@/lib/activity-log";
import type { Student } from "@/lib/db/schema";
import { uuid } from "@/lib/utils/uuid";

/**
 * Students use-cases. Validate input, write through the repository, and
 * record each mutation in the activity log.
 */

export async function listStudents(filters?: StudentFilters): Promise<Student[]> {
  return studentRepository.search(filters);
}

export async function createStudent(input: StudentInput): Promise<Student> {
  const parsed = studentInputSchema.parse(input);
  const row = await studentRepository.insert({ id: uuid(), ...parsed });
  await logActivity({
    action: "student.create",
    entityType: "student",
    entityId: row.id,
    details: { name: row.name },
  });
  return row;
}

export async function updateStudent(id: string, input: StudentInput): Promise<Student> {
  const parsed = studentInputSchema.parse(input);
  const row = await studentRepository.update(id, parsed);
  if (!row) throw new Error(`student ${id} not found`);
  await logActivity({
    action: "student.update",
    entityType: "student",
    entityId: row.id,
    details: { name: row.name },
  });
  return row;
}

export async function deleteStudent(id: string): Promise<void> {
  // FKs are off — clear every child row or they orphan (attendance,
  // payments, memberships, submissions, results, skill levels).
  await Promise.all([
    skillRepository.clearForStudent(id),
    attendanceRepository.clearForStudent(id),
    paymentRepository.clearForStudent(id),
    groupRepository.clearForStudent(id),
    homeworkRepository.clearForStudent(id),
    examRepository.clearForStudent(id),
  ]);
  const removed = await studentRepository.remove(id);
  if (!removed) throw new Error(`student ${id} not found`);
  await logActivity({ action: "student.delete", entityType: "student", entityId: id });
}
