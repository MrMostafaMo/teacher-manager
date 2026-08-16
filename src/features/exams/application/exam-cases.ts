import type { Exam, Student } from "@/lib/db/schema";
import { examRepository } from "@/features/exams/infrastructure/exam-repo";
import {
  examInputSchema,
  examResultSchema,
  type ExamInput,
  type ExamResultInput,
} from "@/features/exams/domain";
import { uuid } from "@/lib/utils/uuid";
import { computeExamDetail, examEligibleIds } from "./exam-stats";
import { examResults, exams } from "@/lib/db/schema";
import { captureBy, captureRows, restoreRows } from "@/lib/db/snapshot";
import { registerUndo } from "@/lib/undo-store";
import {
  logExamCreate,
  logExamDelete,
  logExamResult,
  logExamUpdate,
} from "./exam-logs";

/**
 * Exam use cases. Completion % and per-exam stats are computed in
 * `exam-stats.ts` from member count + result rows.
 */

export interface ExamListItem extends Exam {
  groupName: string | null;
  memberCount: number;
  resultCount: number;
  average: number | null;
  completion: number;
}

export interface ExamDetail extends ExamListItem {
  students: Array<{
    student: Pick<Student, "id" | "name">;
    score: number | null;
    note: string | null;
  }>;
  highest: number | null;
  lowest: number | null;
  passRate: number | null;
}

export async function listExams(): Promise<ExamListItem[]> {
  const rows = await examRepository.list();
  return rows.map((r) => ({
    ...r,
    completion:
      r.memberCount > 0 ? Math.round((r.resultCount / r.memberCount) * 100) : 0,
  }));
}

export async function getExamDetail(id: string): Promise<ExamDetail> {
  const [exam, results] = await Promise.all([
    examRepository.findById(id),
    examRepository.byExam(id),
  ]);
  if (!exam) throw new Error(`exam ${id} not found`);
  const members = await examRepository.members(exam.groupId);
  return {
    ...exam,
    groupName: (await examRepository.groupName(exam.groupId)) ?? null,
    ...computeExamDetail(exam, members, results),
  };
}

export async function createExam(input: ExamInput): Promise<Exam> {
  const data = examInputSchema.parse(input);
  const exam = await examRepository.insert({
    id: uuid(),
    groupId: data.groupId,
    title: data.title,
    date: data.date ?? null,
    maxScore: data.maxScore,
  });
  await logExamCreate(exam);
  return exam;
}

export async function updateExam(
  id: string,
  input: ExamInput,
): Promise<Exam | undefined> {
  const data = examInputSchema.parse(input);
  const existing = await examRepository.findById(id);
  const exam = await examRepository.update(id, {
    groupId: data.groupId,
    title: data.title,
    date: data.date ?? null,
    maxScore: data.maxScore,
  });
  if (exam) {
    if (existing && existing.groupId !== data.groupId) {
      await examRepository.pruneResultsToMembers(id, data.groupId);
    }
    if (existing && existing.maxScore !== data.maxScore) {
      await examRepository.clampResultsToMax(id, data.maxScore);
    }
    await logExamUpdate(exam);
  }
  return exam;
}

export async function deleteExam(
  id: string,
  options: { undo?: boolean } = {},
): Promise<number | null> {
  const exam = await examRepository.findById(id);
  const rows = await captureRows(exams, [id]);
  const results = options.undo === false
    ? []
    : await captureBy(examResults, examResults.examId, id);
  await examRepository.clearForExam(id);
  const ok = await examRepository.remove(id);
  if (!ok) return null;
  if (exam) await logExamDelete(exam.title, id);
  if (options.undo === false) return null;
  return registerUndo(async () => {
    await restoreRows(exams, rows);
    await restoreRows(examResults, results);
  });
}

/** Batch-save result rows for an exam. Empty score clears the result. */
export async function saveExamResults(examId: string, inputs: ExamResultInput[]): Promise<void> {
  const exam = await examRepository.findById(examId);
  if (!exam) throw new Error(`exam ${examId} not found`);
  const maxScore = exam.maxScore;
  const members = await examRepository.members(exam.groupId);
  const eligibleIds = new Set(examEligibleIds(exam, members));

  for (const raw of inputs) {
    const input = examResultSchema.parse(raw);
    if (input.score === null) {
      await examRepository.removeResult(examId, input.studentId);
      continue;
    }
    if (input.score < 0 || input.score > maxScore) {
      throw new Error(`score out of range (0..${maxScore})`);
    }
    if (!eligibleIds.has(input.studentId)) {
      throw new Error(`student ${input.studentId} is not a member of the exam's group`);
    }
    await examRepository.upsertResult(examId, input.studentId, input.score, input.note ?? null);
    await logExamResult(examId, input.studentId, input.score);
  }
}
