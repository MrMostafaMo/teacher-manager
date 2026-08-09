import { and, desc, eq, inArray, notInArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  examResults,
  exams,
  studentGroups,
  students,
  studyGroups,
  type Exam,
  type ExamResult,
  type StudyGroup,
} from "@/lib/db/schema";
import { createRepository } from "@/lib/db/repository";
import { uuid } from "@/lib/utils/uuid";

/**
 * Exam repository: generic CRUD over `exams` plus result reads/aggregates.
 * Result rows exist only when a score is recorded — a student without a row
 * is simply ungraded, so group membership can change after the exam.
 */
export interface ExamListItem extends Exam {
  groupName: string | null;
  memberCount: number;
  resultCount: number;
  average: number | null;
}

export const examRepository = {
  ...createRepository(exams),

  async list(): Promise<ExamListItem[]> {
    const [rows, groups, resultRows, memberships] = await Promise.all([
      db.select().from(exams).orderBy(desc(exams.createdAt)),
      db.select({ id: studyGroups.id, name: studyGroups.name }).from(studyGroups),
      db
        .select({
          examId: examResults.examId,
          studentId: examResults.studentId,
          score: examResults.score,
        })
        .from(examResults),
      db
        .select({
          groupId: studentGroups.groupId,
          studentId: studentGroups.studentId,
        })
        .from(studentGroups),
    ]);
    const groupName = new Map((groups as StudyGroup[]).map((g) => [g.id, g.name]));
    // Stats reflect *current* members only — a former member's stale result
    // must not inflate resultCount/average or the completion percentage.
    const membersOf = new Map<string, Set<string>>();
    const memberCount = new Map<string, number>();
    for (const m of memberships) {
      const set = membersOf.get(m.groupId) ?? new Set<string>();
      set.add(m.studentId);
      membersOf.set(m.groupId, set);
      memberCount.set(m.groupId, (memberCount.get(m.groupId) ?? 0) + 1);
    }
    return (rows as Exam[]).map((e) => {
      const memberIds = membersOf.get(e.groupId);
      const scores = resultRows
        .filter((r) => r.examId === e.id && (!memberIds || memberIds.has(r.studentId)))
        .map((r) => r.score);
      return {
        ...e,
        groupName: groupName.get(e.groupId) ?? null,
        memberCount: memberCount.get(e.groupId) ?? 0,
        resultCount: scores.length,
        average:
          scores.length > 0
            ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
            : null,
      };
    });
  },

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
    const memberships = await db
      .select({ groupId: studentGroups.groupId })
      .from(studentGroups)
      .where(eq(studentGroups.studentId, studentId));
    if (memberships.length === 0) return [];
    const groupIds = memberships.map((m) => m.groupId);
    const [rows, groupRows] = await Promise.all([
      (db
        .select()
        .from(exams)
        .where(inArray(exams.groupId, groupIds))
        .orderBy(desc(exams.createdAt))) as Promise<Exam[]>,
      db.select({ id: studyGroups.id, name: studyGroups.name }).from(studyGroups),
    ]);
    const examIds = rows.map((e) => e.id);
    const results = examIds.length
      ? ((await db
          .select()
          .from(examResults)
          .where(
            and(
              inArray(examResults.examId, examIds),
              eq(examResults.studentId, studentId),
            ),
          )) as ExamResult[])
      : [];
    const byId = new Map(results.map((r) => [r.examId, r]));
    const groupName = new Map((groupRows as StudyGroup[]).map((g) => [g.id, g.name]));
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

  async clearForExam(examId: string): Promise<void> {
    await db.delete(examResults).where(eq(examResults.examId, examId));
  },

  /** Drop results from students no longer in the group (used when the group changes). */
  async pruneResultsToMembers(examId: string, groupId: string): Promise<void> {
    const memberIds = db
      .select({ studentId: studentGroups.studentId })
      .from(studentGroups)
      .where(eq(studentGroups.groupId, groupId));
    await db
      .delete(examResults)
      .where(
        and(
          eq(examResults.examId, examId),
          notInArray(examResults.studentId, memberIds),
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

  async groupName(groupId: string): Promise<string | undefined> {
    const row = await db
      .select({ name: studyGroups.name })
      .from(studyGroups)
      .where(eq(studyGroups.id, groupId))
      .get();
    return row?.name;
  },

  /** Active members of an exam's group, name-asc. */
  async members(groupId: string) {
    const rows = await db
      .select({
        id: students.id,
        name: students.name,
        phone: students.phone,
        guardianName: students.guardianName,
        guardianPhone: students.guardianPhone,
        status: students.status,
        notes: students.notes,
        createdAt: students.createdAt,
        updatedAt: students.updatedAt,
      })
      .from(studentGroups)
      .innerJoin(students, eq(studentGroups.studentId, students.id))
      .where(eq(studentGroups.groupId, groupId))
      .orderBy(students.name);
    return rows;
  },
};
