import { and, count, desc, eq, inArray, isNull, lte, notInArray, or } from "drizzle-orm";
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
import { effectiveDate, enrolledBy } from "@/lib/utils/enrollment";
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

export const homeworkRepository = {
  ...createRepository(homeworks),

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

  /** Submission rows for one homework, keyed by studentId. */
  async byHomework(homeworkId: string): Promise<Map<string, HomeworkSubmission>> {
    const rows = (await db
      .select()
      .from(homeworkSubmissions)
      .where(eq(homeworkSubmissions.homeworkId, homeworkId))) as HomeworkSubmission[];
    return new Map(rows.map((r) => [r.studentId, r]));
  },

  /** The student's group homeworks with their own submission status. */
  async forStudent(
    studentId: string,
  ): Promise<Array<Homework & { groupName: string | null; status: SubmissionStatus }>> {
    const memberships = await db
      .select({ groupId: studentGroups.groupId })
      .from(studentGroups)
      .where(eq(studentGroups.studentId, studentId));
    if (memberships.length === 0) return [];
    const groupIds = memberships.map((m) => m.groupId);
    const [rows, groupRows] = await Promise.all([
      (db
        .select()
        .from(homeworks)
        .where(inArray(homeworks.groupId, groupIds))
        .orderBy(desc(homeworks.createdAt))) as Promise<Homework[]>,
      db.select({ id: studyGroups.id, name: studyGroups.name }).from(studyGroups),
    ]);
    const homeworkIds = rows.map((h) => h.id);
    const submissions = homeworkIds.length
      ? ((await db
          .select()
          .from(homeworkSubmissions)
          .where(
            and(
              inArray(homeworkSubmissions.homeworkId, homeworkIds),
              eq(homeworkSubmissions.studentId, studentId),
            ),
          )) as HomeworkSubmission[])
      : [];
    const byId = new Map(submissions.map((s) => [s.homeworkId, s]));
    const groupName = new Map((groupRows as StudyGroup[]).map((g) => [g.id, g.name]));
    return rows.map((h) => ({
      ...h,
      groupName: groupName.get(h.groupId) ?? null,
      status: byId.get(h.id)?.status ?? "pending",
    }));
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

  /** One student's submissions for a group's homeworks (used on membership removal). */
  async clearForStudentInGroup(studentId: string, groupId: string): Promise<void> {
    const hw = (await db
      .select({ id: homeworks.id })
      .from(homeworks)
      .where(eq(homeworks.groupId, groupId))) as Array<{ id: string }>;
    if (hw.length === 0) return;
    await db
      .delete(homeworkSubmissions)
      .where(
        and(
          inArray(homeworkSubmissions.homeworkId, hw.map((h) => h.id)),
          eq(homeworkSubmissions.studentId, studentId),
        ),
      );
  },

  async clearForHomework(homeworkId: string): Promise<void> {
    await db
      .delete(homeworkSubmissions)
      .where(eq(homeworkSubmissions.homeworkId, homeworkId));
  },

  /** Drop submissions from students no longer in the group or not yet enrolled (used when the group changes). */
  async pruneSubmissionsToMembers(homeworkId: string, groupId: string): Promise<void> {
    const homework = (await db
      .select({ dueDate: homeworks.dueDate, createdAt: homeworks.createdAt })
      .from(homeworks)
      .where(eq(homeworks.id, homeworkId))
      .get()) as { dueDate: string | null; createdAt: number } | undefined;
    if (!homework) return;
    const refDate = effectiveDate(homework.dueDate, homework.createdAt);
    const eligibleIds = db
      .select({ studentId: studentGroups.studentId })
      .from(studentGroups)
      .innerJoin(students, eq(studentGroups.studentId, students.id))
      .where(
        and(
          eq(studentGroups.groupId, groupId),
          or(isNull(students.enrolledOn), lte(students.enrolledOn, refDate)),
        ),
      );
    await db
      .delete(homeworkSubmissions)
      .where(
        and(
          eq(homeworkSubmissions.homeworkId, homeworkId),
          notInArray(homeworkSubmissions.studentId, eligibleIds),
        ),
      );
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
