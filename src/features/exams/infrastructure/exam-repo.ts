import { and, avg, count, desc, eq, inArray } from "drizzle-orm";
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
    const [rows, groups, counts, avgs, members] = await Promise.all([
      db.select().from(exams).orderBy(desc(exams.createdAt)),
      db.select({ id: studyGroups.id, name: studyGroups.name }).from(studyGroups),
      db
        .select({ examId: examResults.examId, n: count() })
        .from(examResults)
        .groupBy(examResults.examId),
      db
        .select({ examId: examResults.examId, value: avg(examResults.score) })
        .from(examResults)
        .groupBy(examResults.examId),
      db
        .select({ groupId: studentGroups.groupId, n: count() })
        .from(studentGroups)
        .groupBy(studentGroups.groupId),
    ]);
    const groupName = new Map((groups as StudyGroup[]).map((g) => [g.id, g.name]));
    const resultCount = new Map(
      (counts as Array<{ examId: string; n: number }>).map((c) => [c.examId, c.n]),
    );
    const average = new Map(
      (avgs as Array<{ examId: string; value: number | null }>).map((a) => [a.examId, a.value]),
    );
    const memberCount = new Map(
      (members as Array<{ groupId: string; n: number }>).map((m) => [m.groupId, m.n]),
    );
    return (rows as Exam[]).map((e) => ({
      ...e,
      groupName: groupName.get(e.groupId) ?? null,
      memberCount: memberCount.get(e.groupId) ?? 0,
      resultCount: resultCount.get(e.id) ?? 0,
      average: average.get(e.id) ?? null,
    }));
  },

  /** Result rows for one exam, keyed by studentId. */
  async byExam(examId: string): Promise<Map<string, ExamResult>> {
    const rows = (await db
      .select()
      .from(examResults)
      .where(eq(examResults.examId, examId))) as ExamResult[];
    return new Map(rows.map((r) => [r.studentId, r]));
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
