import { computeMonthlyRows } from "@/features/attendance/application/attendance-cases";
import { computeMonthlyDues } from "@/features/payments/application/payment-cases";
import { sessionDues } from "@/features/payments/application/session-dues-cases";
import { financeFigures, prevFinance } from "./dashboard-finance";
import { fetchDashboardDims } from "./dashboard-dimensions";
import { monthEnd } from "@/lib/utils/enrollment";
import {
  countNewStudents,
  currentMonth,
  lastMonths,
  monthOf,
  percentDelta,
  shiftMonth,
  statsForMonth,
  todaySessions,
  topWeaknessStudents,
  trendFromAggregates,
} from "./dashboard-helpers";
import type { DashboardData } from "./dashboard-data";

export type { DashboardData };

/**
 * Dashboard use-case. Read-only aggregation over the existing per-feature
 * cases — no writes, no new schema. Each figure reuses the same definition
 * the feature pages show, so the dashboard can't disagree with them.
 */

export async function getDashboardData(
  month = currentMonth(),
  opts?: { billingMode?: "calendar" | "sessions"; sessionsPerCycle?: number; warningAt?: number },
): Promise<DashboardData> {
  const prevMonth = shiftMonth(month, -1);
  const trendMonths = lastMonths(6, month);
  // Single-pass dimensions: shared tables fetch once, every figure derives
  // in JS from the same definitions the feature pages show.
  const {
    students,
    plans,
    memberships,
    paymentsCompact,
    attendanceAgg,
    attendanceCounts,
    expensesRange,
    homeworks,
    exams,
    skills,
    schedule,
    exceptions,
    weakPoints,
  } = await fetchDashboardDims(month, trendMonths);

  const activeStudents = students.filter((s) => s.status === "active");
  const totalStudents = students.length;
  const activeCount = activeStudents.length;
  const monthly = computeMonthlyRows(activeStudents, statsForMonth(attendanceAgg, month), monthEnd(month));
  const prevMonthly = computeMonthlyRows(
    activeStudents,
    statsForMonth(attendanceAgg, prevMonth),
    monthEnd(prevMonth),
  );
  const trend = trendFromAggregates(attendanceAgg, trendMonths);
  const dues = computeMonthlyDues(month, {
    activeStudents,
    plans,
    payments: paymentsCompact.filter((p) => p.period === month),
    memberships,
  });
  const financePayments = trendMonths.map((m) => paymentsCompact.filter((p) => p.period === m));
  const financeExpenses = trendMonths.map((m) => expensesRange.filter((e) => monthOf(e.spentAt) === m));
  const expensesMonth = financeExpenses[financeExpenses.length - 1].reduce((a, e) => a + e.amount, 0);
  const prevExpenses = financeExpenses[financeExpenses.length - 2].reduce((a, e) => a + e.amount, 0);
  const sessionDuesRows = await sessionDues(
    opts?.sessionsPerCycle !== undefined || opts?.warningAt !== undefined
      ? { sessionsPerCycle: opts.sessionsPerCycle ?? 8, warningAt: opts.warningAt ?? 6 }
      : undefined,
    { activeStudents, plans, payments: paymentsCompact, attendanceCounts, memberships },
  );

  const monthHw = homeworks.filter((h) => monthOf(h.dueDate ?? h.createdAt) === month);
  const monthExams = exams.filter((e) => monthOf(e.date ?? e.createdAt) === month);

  const marked = monthly.reduce((a, r) => a + r.present + r.absent + r.late + r.excused, 0);
  const attended = monthly.reduce((a, r) => a + r.present + r.late + r.excused, 0);
  const attendanceRate = marked > 0 ? Math.round((attended / marked) * 100) : 0;

  // Injected by the caller (UI reads the store); defaults to calendar.
  const billingMode = opts?.billingMode ?? "calendar";
  const { collected, outstanding, topDebtors } = financeFigures(
    billingMode,
    financePayments[financePayments.length - 1],
    dues,
    sessionDuesRows,
  );

  const prevMarked = prevMonthly.reduce((a, r) => a + r.present + r.absent + r.late + r.excused, 0);
  const prevAttended = prevMonthly.reduce((a, r) => a + r.present + r.late + r.excused, 0);
  const prevAttendanceRate = prevMarked > 0 ? Math.round((prevAttended / prevMarked) * 100) : 0;
  const { prevCollected, prevNet } = prevFinance(financePayments[financePayments.length - 2], prevExpenses);

  const newStudents = countNewStudents(students, month);

  const totalHwStudents = monthHw.reduce((a, h) => a + h.submitted + h.pending + h.late, 0);
  const homeworkCompletion =
    totalHwStudents > 0
      ? Math.round((monthHw.reduce((a, h) => a + h.submitted + h.late, 0) / totalHwStudents) * 100)
      : 0;
  const homeworkSubmitted = monthHw.reduce((a, h) => a + h.submitted, 0);
  const homeworkPending = monthHw.reduce((a, h) => a + h.pending, 0);
  const homeworkLate = monthHw.reduce((a, h) => a + h.late, 0);
  const overdueHomeworks = monthHw
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

  const graded = monthExams.filter((e) => e.average !== null);
  const scoreSum = graded.reduce((a, e) => {
    const pct = e.maxScore > 0 ? ((e.average ?? 0) / e.maxScore) * 100 : 0;
    return a + Math.min(100, pct) * e.resultCount;
  }, 0);
  const scoreCount = graded.reduce((a, e) => a + e.resultCount, 0);
  // Legacy/synced rows can carry scores above maxScore (pre-validation data) —
  // clamp per-exam at 100% like student-trends/profile-summary do.
  const examAverage =
    scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 10) / 10 : null;
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
    activeStudents: activeCount,
    attendanceRate,
    attendanceTrend: trend,
    financeTrend,
    collected,
    expensesMonth,
    net: collected - expensesMonth,
    outstanding,
    topDebtors,
    sessionDues: sessionDuesRows
      .filter((r) => r.status !== "ok").slice(0, 5)
      .map((r) => ({ student: { id: r.student.id, name: r.student.name }, count: r.count, remainingSessions: r.remainingSessions, status: r.status, isOverdue: r.isOverdue, cyclesOverdue: r.cyclesOverdue, showPaid: r.showPaid })),
    deltas: {
      collected: percentDelta(collected, prevCollected),
      expenses: percentDelta(expensesMonth, prevExpenses),
      net: percentDelta(collected - expensesMonth, prevNet),
      attendanceRate: percentDelta(attendanceRate, prevAttendanceRate),
      newStudents,
    },
    homeworkCompletion,
    homeworkCount: monthHw.length,
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
