import type { Homework } from "@/lib/db/schema";
import { homeworkRepository } from "@/features/homework/infrastructure/homework-repo";
import {
  homeworkInputSchema,
  type HomeworkInput,
  type SubmissionStatus,
} from "@/features/homework/domain";
import { logActivity } from "@/lib/activity-log";
import { uuid } from "@/lib/utils/uuid";
import { formatDate } from "@/lib/utils/format";
import { effectiveDate, enrolledBy } from "@/lib/utils/enrollment";
import type { Student } from "@/lib/db/schema";

/**
 * Homework use cases. Completion % is computed here in JS from member
 * count + submission rows — a student with no row counts as pending.
 */

export interface HomeworkDetail extends HomeworkListItem {
  students: Array<{
    student: Pick<Student, "id" | "name">;
    status: SubmissionStatus;
    submittedAt: number | null;
  }>;
}

export interface HomeworkListItem extends Homework {
  groupName: string | null;
  submitted: number;
  pending: number;
  late: number;
  completion: number;
  /** Past due date with at least one student still pending. */
  overdue: boolean;
}

/** A homework is overdue when its due date has passed and someone is pending. */
export function isOverdue(h: { dueDate: string | null; pending: number }): boolean {
  return h.dueDate !== null && h.dueDate < formatDate(new Date()) && h.pending > 0;
}

export async function listHomeworks(): Promise<HomeworkListItem[]> {
  const rows = await homeworkRepository.list();
  return rows.map((r) => ({
    ...r,
    completion: completionOf(r.submitted, r.pending, r.late),
    overdue: isOverdue(r),
  }));
}

export async function getHomeworkDetail(id: string): Promise<HomeworkDetail> {
  const [homework, submissions] = await Promise.all([
    homeworkRepository.findById(id),
    homeworkRepository.byHomework(id),
  ]);
  if (!homework) throw new Error(`homework ${id} not found`);
  const members = await homeworkRepository.members(homework.groupId);
  const eligible = members.filter((m) =>
    enrolledBy(m, effectiveDate(homework.dueDate, homework.createdAt)),
  );

  const students = eligible.map((m) => {
    const submission = submissions.get(m.id);
    return {
      student: { id: m.id, name: m.name },
      status: (submission?.status ?? "pending") as SubmissionStatus,
      submittedAt: submission?.submittedAt ?? null,
    };
  });

  let submittedCount = 0;
  let pendingCount = 0;
  let lateCount = 0;
  for (const s of students) {
    if (s.status === "submitted") submittedCount += 1;
    else if (s.status === "late") lateCount += 1;
    else pendingCount += 1;
  }

  return {
    ...homework,
    groupName: (await groupNameOf(homework.groupId)) ?? null,
    submitted: submittedCount,
    pending: pendingCount,
    late: lateCount,
    completion: completionOf(submittedCount, pendingCount, lateCount),
    overdue: isOverdue({ dueDate: homework.dueDate, pending: pendingCount }),
    students,
  };
}

function completionOf(submitted: number, pending: number, late: number): number {
  const total = submitted + pending + late;
  return total > 0 ? Math.round(((submitted + late) / total) * 100) : 0;
}

async function groupNameOf(groupId: string): Promise<string | undefined> {
  return homeworkRepository.groupName(groupId);
}

export async function createHomework(input: HomeworkInput): Promise<Homework> {
  const data = homeworkInputSchema.parse(input);
  const homework = await homeworkRepository.insert({
    id: uuid(),
    groupId: data.groupId,
    title: data.title,
    description: data.description ?? null,
    dueDate: data.dueDate ?? null,
  });
  await logActivity({
    action: "homework.create",
    entityType: "homework",
    entityId: homework.id,
    details: { title: homework.title, groupId: homework.groupId, dueDate: homework.dueDate },
  });
  return homework;
}

export async function updateHomework(
  id: string,
  input: HomeworkInput,
): Promise<Homework | undefined> {
  const data = homeworkInputSchema.parse(input);
  const existing = await homeworkRepository.findById(id);
  const homework = await homeworkRepository.update(id, {
    groupId: data.groupId,
    title: data.title,
    description: data.description ?? null,
    dueDate: data.dueDate ?? null,
  });
  if (homework) {
    if (existing && existing.groupId !== data.groupId) {
      await homeworkRepository.pruneSubmissionsToMembers(id, data.groupId);
    }
    await logActivity({
      action: "homework.update",
    entityType: "homework",
      entityId: id,
      details: { title: homework.title, groupId: homework.groupId, dueDate: homework.dueDate },
    });
  }
  return homework;
}

export async function deleteHomework(id: string): Promise<boolean> {
  const homework = await homeworkRepository.findById(id);
  await homeworkRepository.clearForHomework(id);
  const ok = await homeworkRepository.remove(id);
  if (ok && homework) {
    await logActivity({
      action: "homework.delete",
    entityType: "homework",
      entityId: id,
      details: { title: homework.title },
    });
  }
  return ok;
}

export async function setSubmissionStatus(
  homeworkId: string,
  studentId: string,
  status: SubmissionStatus,
): Promise<void> {
  const homework = await homeworkRepository.findById(homeworkId);
  if (!homework) throw new Error(`homework ${homeworkId} not found`);
  const members = await homeworkRepository.members(homework.groupId);
  if (
    !members.some(
      (m) =>
        m.id === studentId && enrolledBy(m, effectiveDate(homework.dueDate, homework.createdAt)),
    )
  ) {
    throw new Error(`student ${studentId} is not a member of the homework's group`);
  }
  await homeworkRepository.upsertSubmission(homeworkId, studentId, status);
  await logActivity({
    action: "homework.submit",
    entityType: "homework",
    entityId: homeworkId,
    details: { studentId, status },
  });
}

/** Set one status for every current member of the homework's group. */
export async function setAllSubmissionStatus(
  homeworkId: string,
  status: SubmissionStatus,
): Promise<void> {
  const homework = await homeworkRepository.findById(homeworkId);
  if (!homework) throw new Error(`homework ${homeworkId} not found`);
  const members = await homeworkRepository.members(homework.groupId);
  const eligible = members.filter((m) =>
    enrolledBy(m, effectiveDate(homework.dueDate, homework.createdAt)),
  );
  for (const m of eligible) {
    await homeworkRepository.upsertSubmission(homeworkId, m.id, status);
  }
  await logActivity({
    action: "homework.submitAll",
    entityType: "homework",
    entityId: homeworkId,
    details: { status, count: eligible.length },
  });
}
