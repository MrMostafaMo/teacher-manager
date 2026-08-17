import { effectiveDate, enrolledBy } from "@/lib/utils/enrollment";

export interface EligibleMember {
  id: string;
  name: string;
  enrolledOn: string | null;
}

export interface ExamStudentRow {
  student: { id: string; name: string };
  score: number | null;
  note: string | null;
}

interface ExamLike {
  date: string | null;
  createdAt: number;
  maxScore: number;
}

export function examEligibleIds(exam: ExamLike, members: EligibleMember[]): string[] {
  return members
    .filter((m) => enrolledBy(m, effectiveDate(exam.date, exam.createdAt)))
    .map((m) => m.id);
}

export function computeExamDetail(
  exam: ExamLike,
  members: EligibleMember[],
  results: Map<string, { score: number | null; note: string | null }>,
) {
  const eligible = members.filter((m) => enrolledBy(m, effectiveDate(exam.date, exam.createdAt)));
  const students: ExamStudentRow[] = eligible.map((m) => {
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
    memberCount: eligible.length,
    resultCount: total,
    average: total > 0 ? averageOf(scores) : null,
    completion: eligible.length > 0 ? Math.round((total / eligible.length) * 100) : 0,
    highest: total > 0 ? Math.max(...scores) : null,
    lowest: total > 0 ? Math.min(...scores) : null,
    passRate:
      total > 0 ? Math.round((scores.filter((s) => s >= passMark).length / total) * 100) : null,
    students,
  };
}

export function averageOf(scores: number[]): number {
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}
