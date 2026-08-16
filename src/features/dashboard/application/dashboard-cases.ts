import { listStudents } from "@/features/students/application/student-cases";
import { getMonthly } from "@/features/attendance/application/attendance-cases";
import { monthlyDues } from "@/features/payments/application/payment-cases";
import { monthlyExpenseTotal } from "@/features/expenses/application/expense-cases";
import { listHomeworks } from "@/features/homework/application/homework-cases";
import { listExams } from "@/features/exams/application/exam-cases";
import { listSkills } from "@/features/skills/application/skill-cases";
import { listSchedule } from "@/features/schedule/application/schedule-cases";
import { listScheduleExceptions } from "@/features/schedule/application/schedule-exception-cases";
import { listAllWeakPoints } from "@/features/weak-points/application/weak-point-cases";
import { attendanceRepository } from "@/features/attendance/infrastructure/attendance-repo";
import { paymentRepository } from "@/features/payments/infrastructure/payment-repo";
import { expenseRepository } from "@/features/expenses/infrastructure/expense-repo";
import {
  countNewStudents,
  currentMonth,
  lastMonths,
  percentDelta,
  shiftMonth,
  todaySessions,
  topWeaknessStudents,
} from "./dashboard-helpers";
import type { DashboardData } from "./dashboard-data";

export type { DashboardData };

/**
 * Dashboard use-case. Read-only aggregation over the existing per-feature
 * cases — no writes, no new schema. Each figure reuses the same definition
 * the feature pages show, so the dashboard can't disagree with them.
 */

export async function getDashboardData(month = currentMonth()): Promise<DashboardData> {
  const prevMonth = shiftMonth(month, -1);
  const trendMonths = lastMonths(6, month);
  const [students, monthly, dues, homeworks, exams, skills, trend, schedule, exceptions, expensesMonth, prevMonthly, prevDues, prevExpenses, financePayments, financeExpenses, weakPoints] =
    await Promise.all([
      listStudents({ status: "all" }),
      getMonthly(month),
      monthlyDues(month),
      listHomeworks(),
      listExams(),
      listSkills(),
      attendanceRepository.monthlyTrend(6, month),
      listSchedule(),
      listScheduleExceptions(),
      monthlyExpenseTotal(month),
      getMonthly(prevMonth),
      monthlyDues(prevMonth),
      monthlyExpenseTotal(prevMonth),
      Promise.all(trendMonths.map((m) => paymentRepository.byPeriod(m))),
      Promise.all(trendMonths.map((m) => expenseRepository.byMonth(m))),
      listAllWeakPoints(),
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

  const newStudents = countNewStudents(students, month);
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
      groupId: h.groupId,
      title: h.title,
      groupName: h.groupName,
      dueDate: h.dueDate,
      pending: h.pending,
    }));

  const graded = exams.filter((e) => e.average !== null);
  const scoreSum = graded.reduce((a, e) => a + ((e.average ?? 0) / e.maxScore) * 100 * e.resultCount, 0);
  const scoreCount = graded.reduce((a, e) => a + e.resultCount, 0);
  const examAverage = scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 10) / 10 : null;

  const weakSkills = skills
    .filter((s) => s.weakCount > 0)
    .map((s) => ({ name: s.name, count: s.weakCount }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const now = new Date();
  const daySessions = todaySessions(schedule, now, exceptions);
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
    topWeakPoints: topWeaknessStudents(weakPoints, students),
    todaySessions: daySessions,
  };
}
