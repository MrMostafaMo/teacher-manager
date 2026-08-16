import { and, desc, eq, gt, inArray, notInArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { examResults, exams, type Exam, type ExamResult } from "@/lib/db/schema";
import { uuid } from "@/lib/utils/uuid";
import { effectiveDate } from "@/lib/utils/enrollment";
import { eligibleStudentIds, groupIdsForStudent, groupNames } from "@/lib/db/group-scoped";

/**
 * Exam-result reads/writes. Result rows exist only when a score is recorded —
 * a student without a row is simply ungraded, so group membership can change
 * after the exam.
 */
export const examResultQueries = {
  /** Result rows for one exam, keyed by studentId. */
  async byExam(examId: string): Promise<Map<string, ExamResult>> {
    const rows = (await db
      .select()
      .from(examResults)
      .where(eq(examResults.examId, examId))) as ExamResult[];
    return new Map(rows.map((r) => [r.studentId, r]));
  },

  /** The student's group exams with their own result row (null = ungraded). */
  async resultsForStudent(
    studentId: string,
  ): Promise<
    Array<Exam & { groupName: string | null; score: number | null; note: string | null }>
  > {
    const groupIds = await groupIdsForStudent(studentId);
    if (groupIds.length === 0) return [];
    const rows = (await db
      .select()
      .from(exams)
      .where(inArray(exams.groupId, groupIds))
      .orderBy(desc(exams.createdAt))) as Exam[];
    const groupName = await groupNames();
    const examIds = rows.map((e) => e.id);
    const results = examIds.length
      ? ((await db
          .select()
          .from(examResults)
          .where(
            and(inArray(examResults.examId, examIds), eq(examResults.studentId, studentId)),
          )) as ExamResult[])
      : [];
    const byId = new Map(results.map((r) => [r.examId, r]));
    return rows.map((e) => ({
      ...e,
      groupName: groupName.get(e.groupId) ?? null,
      score: byId.get(e.id)?.score ?? null,
      note: byId.get(e.id)?.note ?? null,
    }));
  },

  async upsertResult(
    examId: string,
    studentId: string,
    score: number,
    note: string | null,
  ): Promise<void> {
    const existing = await db
      .select({ id: examResults.id })
      .from(examResults)
      .where(and(eq(examResults.examId, examId), eq(examResults.studentId, studentId)))
      .get();
    const ts = Date.now();
    if (existing) {
      await db
        .update(examResults)
        .set({ score, note, updatedAt: ts })
        .where(eq(examResults.id, existing.id));
    } else {
      await db.insert(examResults).values({
        id: uuid(),
        examId,
        studentId,
        score,
        note,
        createdAt: ts,
        updatedAt: ts,
      });
    }
  },

  async removeResult(examId: string, studentId: string): Promise<void> {
    await db
      .delete(examResults)
      .where(and(eq(examResults.examId, examId), eq(examResults.studentId, studentId)));
  },

  /** Cap existing scores at a new, lower maxScore (used when the exam is edited). */
  async clampResultsToMax(examId: string, maxScore: number): Promise<void> {
    await db
      .update(examResults)
      .set({ score: maxScore, updatedAt: Date.now() })
      .where(and(eq(examResults.examId, examId), gt(examResults.score, maxScore)));
  },

  async clearForExam(examId: string): Promise<void> {
    await db.delete(examResults).where(eq(examResults.examId, examId));
  },

  /** Drop results from students no longer in the group or not yet enrolled (used when the group changes). */
  async pruneResultsToMembers(examId: string, groupId: string): Promise<void> {
    const exam = (await db
      .select({ date: exams.date, createdAt: exams.createdAt })
      .from(exams)
      .where(eq(exams.id, examId))
      .get()) as { date: string | null; createdAt: number } | undefined;
    if (!exam) return;
    const refDate = effectiveDate(exam.date, exam.createdAt);
    await db
      .delete(examResults)
      .where(
        and(
          eq(examResults.examId, examId),
          notInArray(examResults.studentId, eligibleStudentIds(groupId, refDate)),
        ),
      );
  },

  /** Every result of a student (used on student delete). */
  async clearForStudent(studentId: string): Promise<void> {
    await db.delete(examResults).where(eq(examResults.studentId, studentId));
  },

  /** Every result + exam of a group (used on group delete). */
  async clearForGroup(groupId: string): Promise<void> {
    const examsOfGroup = (await db
      .select({ id: exams.id })
      .from(exams)
      .where(eq(exams.groupId, groupId))) as Array<{ id: string }>;
    if (examsOfGroup.length === 0) return;
    await db
      .delete(examResults)
      .where(inArray(examResults.examId, examsOfGroup.map((e) => e.id)));
    await db.delete(exams).where(eq(exams.groupId, groupId));
  },

  /** One student's results for a group's exams (used on membership removal). */
  async clearForStudentInGroup(studentId: string, groupId: string): Promise<void> {
    const examsOfGroup = (await db
      .select({ id: exams.id })
      .from(exams)
      .where(eq(exams.groupId, groupId))) as Array<{ id: string }>;
    if (examsOfGroup.length === 0) return;
    await db
      .delete(examResults)
      .where(
        and(
          inArray(examResults.examId, examsOfGroup.map((e) => e.id)),
          eq(examResults.studentId, studentId),
        ),
      );
  },
};
