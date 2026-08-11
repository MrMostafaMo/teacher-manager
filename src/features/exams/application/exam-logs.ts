import { logActivity } from "@/lib/activity-log";
import type { Exam } from "@/lib/db/schema";

export function logExamCreate(exam: Exam): Promise<void> {
  return logActivity({
    action: "exam.create",
    entityType: "exam",
    entityId: exam.id,
    details: { title: exam.title, groupId: exam.groupId, maxScore: exam.maxScore },
  });
}

export function logExamUpdate(exam: Exam): Promise<void> {
  return logActivity({
    action: "exam.update",
    entityType: "exam",
    entityId: exam.id,
    details: { title: exam.title, groupId: exam.groupId, maxScore: exam.maxScore },
  });
}

export function logExamDelete(title: string, id: string): Promise<void> {
  return logActivity({
    action: "exam.delete",
    entityType: "exam",
    entityId: id,
    details: { title },
  });
}

export function logExamResult(
  examId: string,
  studentId: string,
  score: number,
): Promise<void> {
  return logActivity({
    action: "exam.result",
    entityType: "exam",
    entityId: examId,
    details: { studentId, score },
  });
}
