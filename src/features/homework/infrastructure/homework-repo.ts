import { count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  homeworkSubmissions,
  homeworks,
  studentGroups,
  students,
  studyGroups,
  type Homework,
  type StudyGroup,
} from "@/lib/db/schema";
import { createRepository } from "@/lib/db/repository";
import { effectiveDate, enrolledBy } from "@/lib/utils/enrollment";
import { homeworkSubmissionQueries } from "./homework-submission-queries";

/**
 * Homework repository: generic CRUD over `homeworks` plus submission reads.
 * Submission rows are created lazily (only when a status is set), so this
 * layer never fabricates pending rows.
 */
export interface HomeworkListItem extends Homework {
  groupName: string | null;
  /** Submissions grouped by status for this homework. */
  submitted: number;
  pending: number;
  late: number;
}

export const homeworkRepository = {
  ...createRepository(homeworks),
  ...homeworkSubmissionQueries,

  async list(): Promise<HomeworkListItem[]> {
    const [rows, groups, subRows, memberships] = await Promise.all([
      db.select().from(homeworks).orderBy(desc(homeworks.createdAt)),
      db.select({ id: studyGroups.id, name: studyGroups.name }).from(studyGroups),
      db
        .select({
          homeworkId: homeworkSubmissions.homeworkId,
          status: homeworkSubmissions.status,
          studentId: homeworkSubmissions.studentId,
          n: count(),
        })
        .from(homeworkSubmissions)
        .groupBy(
          homeworkSubmissions.homeworkId,
          homeworkSubmissions.status,
          homeworkSubmissions.studentId,
        ),
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
    // Stats reflect *current* members who were already enrolled by the
    // homework's effective date only — a later-joined student (or a stale
    // submission from one) must not inflate submitted/late or drag completion.
    const membersOf = new Map<string, Array<{ studentId: string; enrolledOn: string | null }>>();
    for (const m of memberships) {
      const arr = membersOf.get(m.groupId) ?? [];
      arr.push({ studentId: m.studentId, enrolledOn: m.enrolledOn });
      membersOf.set(m.groupId, arr);
    }
    return (rows as Homework[]).map((h) => {
      const refDate = effectiveDate(h.dueDate, h.createdAt);
      const eligibleIds = new Set(
        (membersOf.get(h.groupId) ?? []).filter((m) => enrolledBy(m, refDate)).map((m) => m.studentId),
      );
      let submitted = 0;
      let late = 0;
      for (const c of subRows) {
        if (c.homeworkId !== h.id) continue;
        if (!eligibleIds.has(c.studentId)) continue;
        if (c.status === "submitted") submitted += c.n;
        else if (c.status === "late") late += c.n;
      }
      // Submission rows are lazy — an eligible member without a row counts as pending.
      const pending = Math.max(0, eligibleIds.size - submitted - late);
      return {
        ...h,
        groupName: groupName.get(h.groupId) ?? null,
        submitted,
        pending,
        late,
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

  /** Active members of a homework's group, name-asc. */
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
