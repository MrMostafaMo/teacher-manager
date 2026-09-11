import { studentRepository } from "@/features/students/infrastructure/student-repo";
import { planRepository } from "@/features/payments/infrastructure/plan-repo";
import { groupRepository } from "@/features/groups/infrastructure/group-repo";
import { attendanceRepository } from "@/features/attendance/infrastructure/attendance-repo";
import { paymentRepository } from "@/features/payments/infrastructure/payment-repo";
import { expenseRepository } from "@/features/expenses/infrastructure/expense-repo";
import { listHomeworks } from "@/features/homework/application/homework-cases";
import { listExams } from "@/features/exams/application/exam-cases";
import { listSkills } from "@/features/skills/application/skill-cases";
import { listSchedule } from "@/features/schedule/application/schedule-cases";
import { listScheduleExceptions } from "@/features/schedule/application/schedule-exception-cases";
import { listAllWeakPoints } from "@/features/weak-points/application/weak-point-cases";
import { monthWindow } from "./dashboard-helpers";

/**
 * Single-pass shared dimensions: every table the dashboard derives from
 * fetches once here (was ~28 IPC round-trips across nested use-cases).
 * Homework/exam coverage stats reuse the enriched membership fetch, so the
 * `studentGroups` scan runs once instead of three times.
 */
export async function fetchDashboardDims(month: string, trendMonths: string[]) {
  const rangeStart = monthWindow(trendMonths[0]).start;
  const rangeEnd = monthWindow(month).end;
  const [
    students,
    plans,
    enrichedMemberships,
    paymentsCompact,
    attendanceAgg,
    attendanceCounts,
    expensesRange,
    skills,
    schedule,
    exceptions,
    weakPoints,
  ] = await Promise.all([
    studentRepository.search({ status: "all" }),
    planRepository.list(),
    groupRepository.membershipsWithEnrollment(),
    paymentRepository.listCompact(),
    attendanceRepository.dashboardAggregates(trendMonths[0]),
    attendanceRepository.countsByStudent(),
    expenseRepository.byRange(rangeStart, rangeEnd),
    listSkills(),
    listSchedule(),
    listScheduleExceptions(),
    listAllWeakPoints(),
  ]);
  // Lean memberships derive from the enriched fetch (dues/session-dues).
  const memberships = enrichedMemberships.map((m) => ({
    studentId: m.studentId,
    groupId: m.groupId,
    groupName: m.groupName,
  }));
  const [homeworks, exams] = await Promise.all([
    listHomeworks({ memberships: enrichedMemberships }),
    listExams({ memberships: enrichedMemberships }),
  ]);
  return {
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
  };
}

export type DashboardDims = Awaited<ReturnType<typeof fetchDashboardDims>>;
