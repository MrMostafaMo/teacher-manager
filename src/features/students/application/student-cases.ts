import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { studentInputSchema, type StudentInput } from "@/features/students/domain";
import {
  studentRepository,
  type StudentFilters,
} from "@/features/students/infrastructure/student-repo";

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

  // Execute all deletions in a single batch (which is wrapped in a BEGIN/COMMIT
  // transaction via our proxy) to prevent partial failures from orphaning rows.
  await db.batch([
    db.delete(studentSkills).where(eq(studentSkills.studentId, id)),
    db.delete(attendance).where(eq(attendance.studentId, id)),
    db.delete(payments).where(eq(payments.studentId, id)),
    db.delete(studentGroups).where(eq(studentGroups.studentId, id)),
    db.delete(homeworkSubmissions).where(eq(homeworkSubmissions.studentId, id)),
    db.delete(examResults).where(eq(examResults.studentId, id)),
    db.delete(sessionAttendance).where(eq(sessionAttendance.studentId, id)),
    db.delete(students).where(eq(students.id, id)),
  ]);
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
