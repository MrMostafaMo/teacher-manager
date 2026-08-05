import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  homeworkSubmissions,
  homeworks,
  studentGroups,
  students,
  studyGroups,
  type Homework,
  type HomeworkSubmission,
  type StudyGroup,
} from "@/lib/db/schema";
import { createRepository } from "@/lib/db/repository";
import { uuid } from "@/lib/utils/uuid";
import type { SubmissionStatus } from "@/features/homework/domain";

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

export interface SubmissionCounts {
  submitted: number;
  pending: number;
  late: number;
}

export const homeworkRepository = {
  ...createRepository(homeworks),

  async list(): Promise<HomeworkListItem[]> {
    const [rows, groups, counts, members] = await Promise.all([
      db.select().from(homeworks).orderBy(desc(homeworks.createdAt)),
      db.select({ id: studyGroups.id, name: studyGroups.name }).from(studyGroups),
      db
        .select({
          homeworkId: homeworkSubmissions.homeworkId,
          status: homeworkSubmissions.status,
          n: count(),
        })
        .from(homeworkSubmissions)
        .groupBy(homeworkSubmissions.homeworkId, homeworkSubmissions.status),
      db
        .select({ groupId: studentGroups.groupId, n: count() })
        .from(studentGroups)
        .groupBy(studentGroups.groupId),
    ]);
    const groupName = new Map((groups as StudyGroup[]).map((g) => [g.id, g.name]));
    const memberCount = new Map(
      (members as Array<{ groupId: string; n: number }>).map((m) => [m.groupId, m.n]),
    );
    const byHomework: Record<string, SubmissionCounts> = {};
    for (const c of counts as Array<{ homeworkId: string; status: SubmissionStatus; n: number }>) {
      const cur = byHomework[c.homeworkId] ?? { submitted: 0, pending: 0, late: 0 };
      cur[c.status] = c.n;
      byHomework[c.homeworkId] = cur;
    }
    return (rows as Homework[]).map((h) => {
      const counts = byHomework[h.id] ?? { submitted: 0, pending: 0, late: 0 };
      const submitted = counts.submitted;
      const late = counts.late;
      // Submission rows are lazy — a member without a row counts as pending.
      const pending = Math.max(0, (memberCount.get(h.groupId) ?? 0) - submitted - late);
      return {
        ...h,
        groupName: groupName.get(h.groupId) ?? null,
        submitted,
        pending,
        late,
      };
    });
  },

  /** Submission rows for one homework, keyed by studentId. */
  async byHomework(homeworkId: string): Promise<Map<string, HomeworkSubmission>> {
    const rows = (await db
      .select()
      .from(homeworkSubmissions)
      .where(eq(homeworkSubmissions.homeworkId, homeworkId))) as HomeworkSubmission[];
    return new Map(rows.map((r) => [r.studentId, r]));
  },

  async upsertSubmission(
    homeworkId: string,
    studentId: string,
    status: SubmissionStatus,
  ): Promise<void> {
    const existing = await db
      .select({ id: homeworkSubmissions.id })
      .from(homeworkSubmissions)
      .where(
        and(
          eq(homeworkSubmissions.homeworkId, homeworkId),
          eq(homeworkSubmissions.studentId, studentId),
        ),
      )
      .get();
    const ts = Date.now();
    if (existing) {
      await db
        .update(homeworkSubmissions)
        .set({
          status,
          submittedAt: status === "pending" ? null : ts,
          updatedAt: ts,
        })
        .where(eq(homeworkSubmissions.id, existing.id));
    } else {
      await db.insert(homeworkSubmissions).values({
        id: uuid(),
        homeworkId,
        studentId,
        status,
        submittedAt: status === "pending" ? null : ts,
        createdAt: ts,
        updatedAt: ts,
      });
    }
  },

  /** Submission rows for every homework of a group (used on group delete). */
  async clearForGroup(groupId: string): Promise<void> {
    const hw = (await db
      .select({ id: homeworks.id })
      .from(homeworks)
      .where(eq(homeworks.groupId, groupId))) as Array<{ id: string }>;
    if (hw.length === 0) return;
    await db
      .delete(homeworkSubmissions)
      .where(inArray(homeworkSubmissions.homeworkId, hw.map((h) => h.id)));
    await db.delete(homeworks).where(eq(homeworks.groupId, groupId));
  },

  async clearForHomework(homeworkId: string): Promise<void> {
    await db
      .delete(homeworkSubmissions)
      .where(eq(homeworkSubmissions.homeworkId, homeworkId));
  },

  /** Every submission of a student (used on student delete). */
  async clearForStudent(studentId: string): Promise<void> {
    await db.delete(homeworkSubmissions).where(eq(homeworkSubmissions.studentId, studentId));
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
