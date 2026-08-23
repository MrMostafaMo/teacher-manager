import { and, desc, eq, inArray, notInArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  homeworkSubmissions,
  homeworks,
  type Homework,
  type HomeworkSubmission,
} from "@/lib/db/schema";
import { uuid } from "@/lib/utils/uuid";
import { effectiveDate } from "@/lib/utils/enrollment";
import { eligibleStudentIds, groupIdsForStudent, groupNames } from "@/lib/db/group-scoped";
import type { SubmissionStatus } from "@/features/homework/domain";

/**
 * Homework-submission reads/writes. Submission rows are created lazily (only
 * when a status is set), so this layer never fabricates pending rows.
 */
export const homeworkSubmissionQueries = {
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
    const groupIds = await groupIdsForStudent(studentId);
    if (groupIds.length === 0) return [];
    const rows = (await db
      .select()
      .from(homeworks)
      .where(inArray(homeworks.groupId, groupIds))
      .orderBy(desc(homeworks.createdAt))) as Homework[];
    const groupName = await groupNames();
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
    await db.delete(homeworkSubmissions).where(
      inArray(
        homeworkSubmissions.homeworkId,
        hw.map((h) => h.id),
      ),
    ).run();
    await db.delete(homeworks).where(eq(homeworks.groupId, groupId)).run();
  },

  /** One student's submissions for a group's homeworks (used on membership removal). */
  async clearForStudentInGroup(studentId: string, groupId: string): Promise<void> {
    const hw = (await db
      .select({ id: homeworks.id })
      .from(homeworks)
      .where(eq(homeworks.groupId, groupId))) as Array<{ id: string }>;
    if (hw.length === 0) return;
    await db.delete(homeworkSubmissions).where(
      and(
        inArray(
          homeworkSubmissions.homeworkId,
          hw.map((h) => h.id),
        ),
        eq(homeworkSubmissions.studentId, studentId),
      ),
    ).run();
  },

  async clearForHomework(homeworkId: string): Promise<void> {
    await db.delete(homeworkSubmissions).where(eq(homeworkSubmissions.homeworkId, homeworkId)).run();
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
    await db
      .delete(homeworkSubmissions)
      .where(
        and(
          eq(homeworkSubmissions.homeworkId, homeworkId),
          notInArray(homeworkSubmissions.studentId, eligibleStudentIds(groupId, refDate)),
        ),
      );
  },

  /** Every submission of a student (used on student delete). */
  async clearForStudent(studentId: string): Promise<void> {
    await db.delete(homeworkSubmissions).where(eq(homeworkSubmissions.studentId, studentId)).run();
  },
};
