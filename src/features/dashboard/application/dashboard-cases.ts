import { listStudents } from "@/features/students/application/student-cases";
import { getMonthly } from "@/features/attendance/application/attendance-cases";
import { monthlyDues } from "@/features/payments/application/payment-cases";
import { listHomeworks } from "@/features/homework/application/homework-cases";
import { listExams } from "@/features/exams/application/exam-cases";
import { listSkills } from "@/features/skills/application/skill-cases";
import { listSchedule } from "@/features/schedule/application/schedule-cases";
import { attendanceRepository } from "@/features/attendance/infrastructure/attendance-repo";

/**
 * Dashboard use-case. Read-only aggregation over the existing per-feature
 * cases — no writes, no new schema. Each figure reuses the same definition
 * the feature pages show, so the dashboard can't disagree with them.
 */

export interface DashboardData {
  totalStudents: number;
  activeStudents: number;
  attendanceRate: number;
  attendanceTrend: Array<{ month: string; present: number; absent: number; late: number }>;
  collected: number;
  outstanding: number;
  homeworkCompletion: number;
  homeworkCount: number;
  homeworkSubmitted: number;
  homeworkPending: number;
  homeworkLate: number;
  examAverage: number | null;
  weakSkills: Array<{ name: string; count: number }>;
  todaySessions: Array<{ id: string; groupName: string; startTime: string; endTime: string; room: string | null }>;
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function getDashboardData(): Promise<DashboardData> {
  const month = currentMonth();
  const [students, monthly, dues, homeworks, exams, skills, trend, schedule] = await Promise.all([
    listStudents({ status: "all" }),
    getMonthly(month),
    monthlyDues(month),
    listHomeworks(),
    listExams(),
    listSkills(),
    attendanceRepository.monthlyTrend(6),
    listSchedule(),
  ]);

  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.status === "active").length;

  const marked = monthly.reduce((a, r) => a + r.present + r.absent + r.late, 0);
  const attended = monthly.reduce((a, r) => a + r.present + r.late, 0);
  const attendanceRate = marked > 0 ? Math.round((attended / marked) * 100) : 0;

  const collected = dues.reduce((a, r) => a + r.paid, 0);
  const outstanding = dues.reduce((a, r) => a + Math.max(0, r.remaining), 0);

  const homeworkCompletion =
    homeworks.length > 0
      ? Math.round(homeworks.reduce((a, h) => a + h.completion, 0) / homeworks.length)
      : 0;
  const homeworkSubmitted = homeworks.reduce((a, h) => a + h.submitted, 0);
  const homeworkPending = homeworks.reduce((a, h) => a + h.pending, 0);
  const homeworkLate = homeworks.reduce((a, h) => a + h.late, 0);

  const graded = exams.filter((e) => e.average !== null);
  const scoreSum = graded.reduce((a, e) => a + (e.average ?? 0) * e.resultCount, 0);
  const scoreCount = graded.reduce((a, e) => a + e.resultCount, 0);
  const examAverage = scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 10) / 10 : null;

  const weakSkills = skills
    .filter((s) => s.weakCount > 0)
    .map((s) => ({ name: s.name, count: s.weakCount }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const today = new Date().getDay();
  const todaySessions = schedule
    .filter((s) => s.groupStatus === "active" && s.dayOfWeek === today)
    .map((s) => ({
      id: s.id,
      groupName: s.groupName,
      startTime: s.startTime,
      endTime: s.endTime,
      room: s.room,
    }))
    .slice(0, 4);

  return {
    totalStudents,
    activeStudents,
    attendanceRate,
    attendanceTrend: trend,
    collected,
    outstanding,
    homeworkCompletion,
    homeworkCount: homeworks.length,
    homeworkSubmitted,
    homeworkPending,
    homeworkLate,
    examAverage,
    weakSkills,
    todaySessions,
  };
}
