import { formatDate } from "@/lib/utils/format";
import { effectiveDate, enrolledBy } from "@/lib/utils/enrollment";
import type { HomeworkSubmission } from "@/lib/db/schema";
import type { SubmissionStatus } from "@/features/homework/domain";

/** A homework is overdue when its due date has passed and someone is pending. */
export function isOverdue(h: { dueDate: string | null; pending: number }): boolean {
  // `dueDate` is a stored ISO key ("YYYY-MM-DD") — compare against the same format.
  return h.dueDate !== null && h.dueDate < formatDate(new Date(), "YYYY-MM-DD") && h.pending > 0;
}

/** Completion % — a student with no submission row counts as pending. */
export function completionOf(submitted: number, pending: number, late: number): number {
  const total = submitted + pending + late;
  return total > 0 ? Math.round(((submitted + late) / total) * 100) : 0;
}

/** Build per-student submission rows for a homework's members plus the counts. */
export function buildHomeworkStudents(
  members: Array<{ id: string; name: string; enrolledOn: string | null }>,
  submissions: Map<string, HomeworkSubmission>,
  dueDate: string | null,
  createdAt: number,
) {
  const students = members
    .filter((m) => enrolledBy(m, effectiveDate(dueDate, createdAt)))
    .map((m) => {
      const submission = submissions.get(m.id);
      return {
        student: { id: m.id, name: m.name },
        status: (submission?.status ?? "pending") as SubmissionStatus,
        submittedAt: submission?.submittedAt ?? null,
      };
    });
  let submitted = 0;
  let pending = 0;
  let late = 0;
  for (const s of students) {
    if (s.status === "submitted") submitted += 1;
    else if (s.status === "late") late += 1;
    else pending += 1;
  }
  return {
    students,
    submitted,
    pending,
    late,
    completion: completionOf(submitted, pending, late),
    overdue: isOverdue({ dueDate, pending }),
  };
}
