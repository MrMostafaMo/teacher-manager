import type { Exam, Student } from "@/lib/db/schema";
import { examRepository } from "@/features/exams/infrastructure/exam-repo";
import {
  examInputSchema,
  examResultSchema,
  type ExamInput,
  type ExamResultInput,
} from "@/features/exams/domain";
import { logActivity } from "@/lib/activity-log";
import { uuid } from "@/lib/utils/uuid";

/**
 * Exam use cases. Completion % and per-exam stats are computed here in JS
 * from member count + result rows.
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

  const students = members.map((m) => {
    const row = results.get(m.id);
    return {
      student: { id: m.id, name: m.name },
      score: row?.score ?? null,
      note: row?.note ?? null,
    };
  });

  const scores = students.flatMap((s) => (s.score === null ? [] : [s.score]));
  const total = scores.length;
  const passMark = Math.ceil(exam.maxScore / 2);

  return {
    ...exam,
    groupName: (await examRepository.groupName(exam.groupId)) ?? null,
    memberCount: members.length,
    resultCount: total,
    average: total > 0 ? averageOf(scores) : null,
    completion: members.length > 0 ? Math.round((total / members.length) * 100) : 0,
    highest: total > 0 ? Math.max(...scores) : null,
    lowest: total > 0 ? Math.min(...scores) : null,
    passRate: total > 0 ? Math.round((scores.filter((s) => s >= passMark).length / total) * 100) : null,
    students,
  };
}

function averageOf(scores: number[]): number {
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
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
  await logActivity({
    action: "exam.create",
    entityType: "exam",
    entityId: exam.id,
    details: { title: exam.title, groupId: exam.groupId, maxScore: exam.maxScore },
  });
  return exam;
}

export async function updateExam(
  id: string,
  input: ExamInput,
): Promise<Exam | undefined> {
  const data = examInputSchema.parse(input);
  const exam = await examRepository.update(id, {
    groupId: data.groupId,
    title: data.title,
    date: data.date ?? null,
    maxScore: data.maxScore,
  });
  if (exam) {
    await logActivity({
      action: "exam.update",
      entityType: "exam",
      entityId: id,
      details: { title: exam.title, groupId: exam.groupId, maxScore: exam.maxScore },
    });
  }
  return exam;
}

export async function deleteExam(id: string): Promise<boolean> {
  const exam = await examRepository.findById(id);
  await examRepository.clearForExam(id);
  const ok = await examRepository.remove(id);
  if (ok && exam) {
    await logActivity({
      action: "exam.delete",
      entityType: "exam",
      entityId: id,
      details: { title: exam.title },
    });
  }
  return ok;
}

/** Batch-save result rows for an exam. Empty score clears the result. */
export async function saveExamResults(examId: string, inputs: ExamResultInput[]): Promise<void> {
  const exam = await examRepository.findById(examId);
  if (!exam) throw new Error(`exam ${examId} not found`);
  const maxScore = exam.maxScore;

  for (const raw of inputs) {
    const input = examResultSchema.parse(raw);
    if (input.score === null) {
      await examRepository.removeResult(examId, input.studentId);
      continue;
    }
    if (input.score < 0 || input.score > maxScore) {
      throw new Error(`score out of range (0..${maxScore})`);
    }
    await examRepository.upsertResult(examId, input.studentId, input.score, input.note ?? null);
    await logActivity({
      action: "exam.result",
      entityType: "exam",
      entityId: examId,
      details: { studentId: input.studentId, score: input.score },
    });
  }
}
