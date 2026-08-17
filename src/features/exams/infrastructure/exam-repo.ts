import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  examResults,
  exams,
  studentGroups,
  students,
  studyGroups,
  type Exam,
  type StudyGroup,
} from "@/lib/db/schema";
import { createRepository } from "@/lib/db/repository";
import { effectiveDate, enrolledBy } from "@/lib/utils/enrollment";
import { examResultQueries } from "./exam-result-queries";

/**
 * Exam repository: generic CRUD over `exams` plus result reads/aggregates.
 * Result rows live behind `examResultQueries` but are re-exposed on the same
 * `examRepository` object so callers keep one import.
 */
export interface ExamListItem extends Exam {
  groupName: string | null;
  memberCount: number;
  resultCount: number;
  average: number | null;
}

export const examRepository = {
  ...createRepository(exams),
  ...examResultQueries,

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
          enrolledOn: students.enrolledOn,
        })
        .from(studentGroups)
        .innerJoin(students, eq(studentGroups.studentId, students.id)),
    ]);
    const groupName = new Map((groups as StudyGroup[]).map((g) => [g.id, g.name]));
    // Stats reflect *current* members who were already enrolled by the exam's
    // effective date only — a later-joined student's stale result must not
    // inflate resultCount/average or the completion percentage.
    const membersOf = new Map<string, Array<{ studentId: string; enrolledOn: string | null }>>();
    for (const m of memberships) {
      const arr = membersOf.get(m.groupId) ?? [];
      arr.push({ studentId: m.studentId, enrolledOn: m.enrolledOn });
      membersOf.set(m.groupId, arr);
    }
    return (rows as Exam[]).map((e) => {
      const refDate = effectiveDate(e.date, e.createdAt);
      const eligibleIds = new Set(
        (membersOf.get(e.groupId) ?? [])
          .filter((m) => enrolledBy(m, refDate))
          .map((m) => m.studentId),
      );
      const scores = resultRows
        .filter((r) => r.examId === e.id && eligibleIds.has(r.studentId))
        .map((r) => r.score);
      return {
        ...e,
        groupName: groupName.get(e.groupId) ?? null,
        memberCount: eligibleIds.size,
        resultCount: scores.length,
        average:
          scores.length > 0
            ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
            : null,
      };
    });
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
        enrolledOn: students.enrolledOn,
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
