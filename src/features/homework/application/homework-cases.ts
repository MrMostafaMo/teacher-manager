import type { Homework } from "@/lib/db/schema";
import { homeworkRepository } from "@/features/homework/infrastructure/homework-repo";
import {
  homeworkInputSchema,
  type HomeworkInput,
  type SubmissionStatus,
} from "@/features/homework/domain";
import { uuid } from "@/lib/utils/uuid";
import { effectiveDate, enrolledBy } from "@/lib/utils/enrollment";
import { buildHomeworkStudents, completionOf, isOverdue } from "./homework-stats";
import { homeworks, homeworkSubmissions } from "@/lib/db/schema";
import { captureBy, captureRows, restoreRows } from "@/lib/db/snapshot";
import { registerUndo } from "@/lib/undo-store";
import {
  logHomeworkCreate,
  logHomeworkDelete,
  logHomeworkSubmit,
  logHomeworkSubmitAll,
  logHomeworkUpdate,
} from "./homework-logs";

/**
 * Homework use cases. Completion % is computed in `homework-stats.ts` from
 * member count + submission rows — a student with no row counts as pending.
 */

export interface HomeworkDetail extends HomeworkListItem {
  students: Array<{
    student: { id: string; name: string };
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
  const stats = buildHomeworkStudents(members, submissions, homework.dueDate, homework.createdAt);
  return {
    ...homework,
    groupName: (await homeworkRepository.groupName(homework.groupId)) ?? null,
    ...stats,
  };
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
  await logHomeworkCreate(homework);
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
    await logHomeworkUpdate(homework);
  }
  return homework;
}

export async function deleteHomework(
  id: string,
  options: { undo?: boolean } = {},
): Promise<number | null> {
  const homework = await homeworkRepository.findById(id);
  const rows = await captureRows(homeworks, [id]);
  const submissions = options.undo === false
    ? []
    : await captureBy(homeworkSubmissions, homeworkSubmissions.homeworkId, id);
  await homeworkRepository.clearForHomework(id);
  const ok = await homeworkRepository.remove(id);
  if (!ok) return null;
  if (homework) await logHomeworkDelete(homework.title, id);
  if (options.undo === false) return null;
  return registerUndo(async () => {
    await restoreRows(homeworks, rows);
    await restoreRows(homeworkSubmissions, submissions);
  });
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
  await logHomeworkSubmit(homeworkId, studentId, status);
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
  await logHomeworkSubmitAll(homeworkId, status, eligible.length);
}
