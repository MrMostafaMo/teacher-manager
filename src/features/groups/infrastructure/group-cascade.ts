import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  attendance,
  examResults,
  exams,
  groupSessions,
  homeworkSubmissions,
  homeworks,
  sessionExceptions,
  studentGroups,
  studyGroups,
} from "@/lib/db/schema";

/**
 * Atomic group delete: one batch (BEGIN/COMMIT in the proxy) over the group
 * row plus every child table. Sub-selects stay lazy so `inArray` resolves
 * them inside the same transaction.
 */
export async function removeGroupCascade(id: string): Promise<void> {
  const hwIds = db.select({ id: homeworks.id }).from(homeworks).where(eq(homeworks.groupId, id));
  const exIds = db.select({ id: exams.id }).from(exams).where(eq(exams.groupId, id));
  const sessIds = db
    .select({ id: groupSessions.id })
    .from(groupSessions)
    .where(eq(groupSessions.groupId, id));

  await db.batch([
    db.delete(studentGroups).where(eq(studentGroups.groupId, id)),
    db.delete(attendance).where(eq(attendance.groupId, id)),
    db.delete(homeworkSubmissions).where(inArray(homeworkSubmissions.homeworkId, hwIds)),
    db.delete(homeworks).where(eq(homeworks.groupId, id)),
    db.delete(examResults).where(inArray(examResults.examId, exIds)),
    db.delete(exams).where(eq(exams.groupId, id)),
    db.delete(sessionExceptions).where(inArray(sessionExceptions.sessionId, sessIds)),
    db.delete(groupSessions).where(eq(groupSessions.groupId, id)),
    db.delete(studyGroups).where(eq(studyGroups.id, id)),
  ]);
}
