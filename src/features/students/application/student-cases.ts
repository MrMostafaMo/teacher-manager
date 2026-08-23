import { studentInputSchema, type StudentInput } from "@/features/students/domain";
import {
  studentRepository,
  type StudentFilters,
} from "@/features/students/infrastructure/student-repo";
import { skillRepository } from "@/features/skills/infrastructure/skill-repo";
import { attendanceRepository } from "@/features/attendance/infrastructure/attendance-repo";
import { paymentRepository } from "@/features/payments/infrastructure/payment-repo";
import { groupRepository } from "@/features/groups/infrastructure/group-repo";
import { homeworkRepository } from "@/features/homework/infrastructure/homework-repo";
import { examRepository } from "@/features/exams/infrastructure/exam-repo";
import { scheduleRepository } from "@/features/schedule/infrastructure/schedule-repo";
import { logActivity } from "@/lib/activity-log";
import {
  attendance,
  examResults,
  homeworkSubmissions,
  payments,
  sessionAttendance,
  studentGroups,
  studentSkills,
  students,
  type Student,
} from "@/lib/db/schema";
import { captureBy, captureRows, restoreRows } from "@/lib/db/snapshot";
import { registerUndo } from "@/lib/undo-store";
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

export async function deleteStudent(
  id: string,
  options: { undo?: boolean } = {},
): Promise<number | null> {
  const undoEnabled = options.undo !== false;
  const studentRows = undoEnabled ? await captureRows(students, [id]) : [];
  const paymentRows = undoEnabled ? await captureBy(payments, payments.studentId, id) : [];
  const attendanceRows = undoEnabled ? await captureBy(attendance, attendance.studentId, id) : [];
  const membershipRows = undoEnabled
    ? await captureBy(studentGroups, studentGroups.studentId, id)
    : [];
  const sessionRows = undoEnabled
    ? await captureBy(sessionAttendance, sessionAttendance.studentId, id)
    : [];
  const submissionRows = undoEnabled
    ? await captureBy(homeworkSubmissions, homeworkSubmissions.studentId, id)
    : [];
  const resultRows = undoEnabled ? await captureBy(examResults, examResults.studentId, id) : [];
  const skillRows = undoEnabled ? await captureBy(studentSkills, studentSkills.studentId, id) : [];

  // FKs are off — clear every child row or they orphan (attendance,
  // payments, memberships, submissions, results, skill levels).
  // ponytail: 7 deletes + remove with no transaction; partial failure orphans rows.
  // Wrap in a single DB transaction when sqlite-proxy exposes it.
  await Promise.all([
    skillRepository.clearForStudent(id),
    attendanceRepository.clearForStudent(id),
    paymentRepository.clearForStudent(id),
    groupRepository.clearForStudent(id),
    homeworkRepository.clearForStudent(id),
    examRepository.clearForStudent(id),
    scheduleRepository.clearAttendanceForStudent(id),
  ]);
  const removed = await studentRepository.remove(id);
  if (!removed) throw new Error(`student ${id} not found`);
  await logActivity({ action: "student.delete", entityType: "student", entityId: id });
  if (!undoEnabled) return null;
  return registerUndo(async () => {
    await restoreRows(students, studentRows);
    await restoreRows(payments, paymentRows);
    await restoreRows(attendance, attendanceRows);
    await restoreRows(studentGroups, membershipRows);
    await restoreRows(sessionAttendance, sessionRows);
    await restoreRows(homeworkSubmissions, submissionRows);
    await restoreRows(examResults, resultRows);
    await restoreRows(studentSkills, skillRows);
  });
}
