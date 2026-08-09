import { listStudents } from "@/features/students/application/student-cases";
import { getMonthly } from "@/features/attendance/application/attendance-cases";
import { monthlyDues } from "@/features/payments/application/payment-cases";
import { monthlyExpenseTotal } from "@/features/expenses/application/expense-cases";
import { listHomeworks } from "@/features/homework/application/homework-cases";
import { listExams } from "@/features/exams/application/exam-cases";
import { listSkills } from "@/features/skills/application/skill-cases";
import { listSchedule } from "@/features/schedule/application/schedule-cases";
import { attendanceRepository } from "@/features/attendance/infrastructure/attendance-repo";
import { paymentRepository } from "@/features/payments/infrastructure/payment-repo";
import { expenseRepository } from "@/features/expenses/infrastructure/expense-repo";

/**
 * Dashboard use-case. Read-only aggregation over the existing per-feature
 * cases — no writes, no new schema. Each figure reuses the same definition
 * the feature pages show, so the dashboard can't disagree with them.
 */

export interface DashboardData {
  totalStudents: number;
  activeStudents: number;
  attendanceRate: number;
  attendanceTrend: Array<{ month: string; present: number; absent: number; late: number; excused: number }>;
  financeTrend: Array<{ month: string; collected: number; expenses: number }>;
  collected: number;
  expensesMonth: number;
  net: number;
  outstanding: number;
  topDebtors: Array<{ id: string; name: string; remaining: number }>;
  deltas: {
    collected: number | null;
    expenses: number | null;
    net: number | null;
    attendanceRate: number | null;
    newStudents: number;
  };
  homeworkCompletion: number;
  homeworkCount: number;
  homeworkSubmitted: number;
  homeworkPending: number;
  homeworkLate: number;
  overdueHomeworks: Array<{
    id: string;
    title: string;
    groupName: string | null;
    dueDate: string | null;
    pending: number;
  }>;
  examAverage: number | null;
  weakSkills: Array<{ name: string; count: number }>;
  todaySessions: Array<{
    id: string;
    groupName: string;
    startTime: string;
    endTime: string;
    room: string | null;
    finished: boolean;
  }>;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function previousMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** ISO month keys for the last `n` months, oldest first. */
function lastMonths(n: number): string[] {
  const months: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const dd = new Date(d.getFullYear(), d.getMonth() - i, 1);
    months.push(`${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

function percentDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export async function getDashboardData(): Promise<DashboardData> {
  const month = currentMonth();
  const prevMonth = previousMonth();
  const trendMonths = lastMonths(6);
  const [students, monthly, dues, homeworks, exams, skills, trend, schedule, expensesMonth, prevMonthly, prevDues, prevExpenses, financePayments, financeExpenses] =
    await Promise.all([
      listStudents({ status: "all" }),
      getMonthly(month),
      monthlyDues(month),
      listHomeworks(),
      listExams(),
      listSkills(),
      attendanceRepository.monthlyTrend(6),
      listSchedule(),
      monthlyExpenseTotal(month),
      getMonthly(prevMonth),
      monthlyDues(prevMonth),
      monthlyExpenseTotal(prevMonth),
      Promise.all(trendMonths.map((m) => paymentRepository.byPeriod(m))),
      Promise.all(trendMonths.map((m) => expenseRepository.byMonth(m))),
    ]);

  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.status === "active").length;

  const marked = monthly.reduce((a, r) => a + r.present + r.absent + r.late + r.excused, 0);
  const attended = monthly.reduce((a, r) => a + r.present + r.late + r.excused, 0);
  const attendanceRate = marked > 0 ? Math.round((attended / marked) * 100) : 0;

  const collected = dues.reduce((a, r) => a + r.paid, 0);
  const outstanding = dues.reduce((a, r) => a + Math.max(0, r.remaining), 0);

  const prevMarked = prevMonthly.reduce((a, r) => a + r.present + r.absent + r.late + r.excused, 0);
  const prevAttended = prevMonthly.reduce((a, r) => a + r.present + r.late + r.excused, 0);
  const prevAttendanceRate = prevMarked > 0 ? Math.round((prevAttended / prevMarked) * 100) : 0;
  const prevCollected = prevDues.reduce((a, r) => a + r.paid, 0);
  const prevNet = prevCollected - prevExpenses;

  const monthPrefix = month.slice(0, 7);
  const monthStart = Date.parse(`${monthPrefix}-01T00:00:00`);
  const d = new Date(monthStart);
  d.setMonth(d.getMonth() + 1);
  const nextMonthStart = d.getTime();
  const newStudents = students.filter((s) => {
    const enrolled = s.enrolledOn ? Date.parse(s.enrolledOn) : s.createdAt;
    return Number.isFinite(enrolled) && enrolled >= monthStart && enrolled < nextMonthStart;
  }).length;
  const topDebtors = dues
    .filter((r) => r.remaining > 0)
    .sort((a, b) => b.remaining - a.remaining)
    .slice(0, 5)
    .map((r) => ({ id: r.student.id, name: r.student.name, remaining: r.remaining }));

  const homeworkCompletion =
    homeworks.length > 0
      ? Math.round(homeworks.reduce((a, h) => a + h.completion, 0) / homeworks.length)
      : 0;
  const homeworkSubmitted = homeworks.reduce((a, h) => a + h.submitted, 0);
  const homeworkPending = homeworks.reduce((a, h) => a + h.pending, 0);
  const homeworkLate = homeworks.reduce((a, h) => a + h.late, 0);

  const overdueHomeworks = homeworks
    .filter((h) => h.overdue)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
    .slice(0, 5)
    .map((h) => ({
      id: h.id,
      title: h.title,
      groupName: h.groupName,
      dueDate: h.dueDate,
      pending: h.pending,
    }));

  const graded = exams.filter((e) => e.average !== null);
  const scoreSum = graded.reduce((a, e) => a + (e.average ?? 0) * e.resultCount, 0);
  const scoreCount = graded.reduce((a, e) => a + e.resultCount, 0);
  const examAverage = scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 10) / 10 : null;

  const weakSkills = skills
    .filter((s) => s.weakCount > 0)
    .map((s) => ({ name: s.name, count: s.weakCount }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const now = new Date();
  const today = now.getDay();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todaySessions = schedule
    .filter(
      (s) =>
        s.groupStatus === "active" &&
        s.dayOfWeek === today &&
        (s.groupStartsOn == null || s.groupStartsOn <= todayIso),
    )
    .map((s) => ({
      id: s.id,
      groupName: s.groupName,
      startTime: s.startTime,
      endTime: s.endTime,
      room: s.room,
      finished: nowMinutes > timeToMinutes(s.endTime),
    }));

  const financeTrend = trendMonths.map((m, i) => ({
    month: m,
    collected: financePayments[i].reduce((a, p) => a + p.amount, 0),
    expenses: financeExpenses[i].reduce((a, e) => a + e.amount, 0),
  }));

  return {
    totalStudents,
    activeStudents,
    attendanceRate,
    attendanceTrend: trend,
    financeTrend,
    collected,
    expensesMonth,
    net: collected - expensesMonth,
    outstanding,
    topDebtors,
    deltas: {
      collected: percentDelta(collected, prevCollected),
      expenses: percentDelta(expensesMonth, prevExpenses),
      net: percentDelta(collected - expensesMonth, prevNet),
      attendanceRate: percentDelta(attendanceRate, prevAttendanceRate),
      newStudents,
    },
    homeworkCompletion,
    homeworkCount: homeworks.length,
    homeworkSubmitted,
    homeworkPending,
    homeworkLate,
    overdueHomeworks,
    examAverage,
    weakSkills,
    todaySessions,
  };
}
