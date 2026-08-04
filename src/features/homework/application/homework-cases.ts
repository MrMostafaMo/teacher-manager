import type { Homework } from "@/lib/db/schema";
import { homeworkRepository } from "@/features/homework/infrastructure/homework-repo";
import {
  homeworkInputSchema,
  type HomeworkInput,
  type SubmissionStatus,
} from "@/features/homework/domain";
import { logActivity } from "@/lib/activity-log";
import { uuid } from "@/lib/utils/uuid";
import type { Student } from "@/lib/db/schema";

/**
 * Homework use cases. Completion % is computed here in JS from member
 * count + submission rows — a student with no row counts as pending.
 */

export interface HomeworkDetail extends HomeworkListItem {
  students: Array<{
    student: Pick<Student, "id" | "name">;
    status: SubmissionStatus;
  }>;
}

export interface HomeworkListItem extends Homework {
  groupName: string | null;
  submitted: number;
  pending: number;
  late: number;
  completion: number;
}

export async function listHomeworks(): Promise<HomeworkListItem[]> {
  const rows = await homeworkRepository.list();
  return rows.map((r) => ({
    ...r,
    completion: completionOf(r.submitted, r.pending, r.late),
  }));
}

export async function getHomeworkDetail(id: string): Promise<HomeworkDetail> {
  const [homework, submissions] = await Promise.all([
    homeworkRepository.findById(id),
    homeworkRepository.byHomework(id),
  ]);
  if (!homework) throw new Error(`homework ${id} not found`);
  const members = await homeworkRepository.members(homework.groupId);

  const students = members.map((m) => ({
    student: { id: m.id, name: m.name },
    status: (submissions.get(m.id)?.status ?? "pending") as SubmissionStatus,
  }));

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
  const homework = await homeworkRepository.update(id, {
    groupId: data.groupId,
    title: data.title,
    description: data.description ?? null,
    dueDate: data.dueDate ?? null,
  });
  if (homework) {
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
  await homeworkRepository.upsertSubmission(homeworkId, studentId, status);
  await logActivity({
    action: "homework.submit",
    entityType: "homework",
    entityId: homeworkId,
    details: { studentId, status },
  });
}
