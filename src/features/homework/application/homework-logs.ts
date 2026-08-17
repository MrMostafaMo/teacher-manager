import { logActivity } from "@/lib/activity-log";
import type { Homework } from "@/lib/db/schema";
import type { SubmissionStatus } from "@/features/homework/domain";

function log(action: string, entityId: string, details: Record<string, unknown>): Promise<void> {
  return logActivity({ action, entityType: "homework", entityId, details });
}

export function logHomeworkCreate(hw: Homework): Promise<void> {
  return log("homework.create", hw.id, {
    title: hw.title,
    groupId: hw.groupId,
    dueDate: hw.dueDate,
  });
}

export function logHomeworkUpdate(hw: Homework): Promise<void> {
  return log("homework.update", hw.id, {
    title: hw.title,
    groupId: hw.groupId,
    dueDate: hw.dueDate,
  });
}

export function logHomeworkDelete(title: string, id: string): Promise<void> {
  return log("homework.delete", id, { title });
}

export function logHomeworkSubmit(
  homeworkId: string,
  studentId: string,
  status: SubmissionStatus,
): Promise<void> {
  return log("homework.submit", homeworkId, { studentId, status });
}

export function logHomeworkSubmitAll(
  homeworkId: string,
  status: SubmissionStatus,
  count: number,
): Promise<void> {
  return log("homework.submitAll", homeworkId, { status, count });
}
