import { studentRepository } from "@/features/students/infrastructure/student-repo";
import { groupRepository } from "@/features/groups/infrastructure/group-repo";
import { attendanceRepository, type StudentMonthlyStat } from "@/features/attendance/infrastructure/attendance-repo";
import { planRepository, type PlanWithCount } from "@/features/payments/infrastructure/plan-repo";
import { homeworkRepository } from "@/features/homework/infrastructure/homework-repo";
import { examRepository } from "@/features/exams/infrastructure/exam-repo";
import { scheduleRepository } from "@/features/schedule/infrastructure/schedule-repo";
import { listPaymentHistory, type PaymentHistoryRow } from "@/features/payments/application/payment-cases";
import { getStudentSkills, type StudentSkillRow } from "@/features/skills/application/skill-cases";
import {
  listStudentWeakPoints,
  type StudentWeakPoint,
} from "@/features/weak-points/application/weak-point-cases";
import {
  computeStatement,
  statementPeriods,
} from "@/features/payments/application/payment-statement";
import { currentMonth } from "@/lib/utils/months";
import { listRecentActivity } from "@/lib/activity-log";
import type { Student, Attendance, Homework, Exam, SessionAttendance } from "@/lib/db/schema";
import type { SubmissionStatus } from "@/features/homework/domain";

/**
 * Student-profile use-cases. A single aggregate loader that composes the
 * student's data across every feature (plan, groups, attendance, payments,
 * homework, exams, session attendance, skills) plus a recent-activity feed
 * scoped to that student.
 */

export interface ProfileHomework extends Homework {
  groupName: string | null;
  status: SubmissionStatus;
}

export interface ProfileExam extends Exam {
  groupName: string | null;
  score: number | null;
  note: string | null;
}

export interface ProfileSessionAttendance extends SessionAttendance {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
  groupName: string;
}

export interface StudentProfileData {
  student: Student;
  planName: string | null;
  groups: Array<{ id: string; name: string }>;
  attendanceStats: StudentMonthlyStat;
  attendanceHistory: Attendance[];
  payments: PaymentHistoryRow[];
  homeworks: ProfileHomework[];
  exams: ProfileExam[];
  sessionAttendance: ProfileSessionAttendance[];
  skills: StudentSkillRow[];
  weakPoints: StudentWeakPoint[];
  activity: Array<{ id: string; action: string; createdAt: number }>;
  /** due − paid across all statement months; negative means paid ahead. */
  balance: number;
}

/** Load everything for the profile page in one call. */
export async function getStudentProfile(studentId: string): Promise<StudentProfileData> {
  const [
    student,
    plans,
    memberships,
    attendanceStats,
    attendanceHistory,
    payments,
    homeworks,
    exams,
    sessionAttendance,
    skills,
    weakPoints,
    activity,
  ] = await Promise.all([
    studentRepository.findById(studentId),
    planRepository.list(),
    groupRepository.memberships(),
    attendanceRepository.statsForStudent(studentId),
    attendanceRepository.byStudent(studentId),
    listPaymentHistory({ studentId }),
    homeworkRepository.forStudent(studentId),
    examRepository.resultsForStudent(studentId),
    scheduleRepository.sessionAttendanceByStudent(studentId),
    getStudentSkills(studentId),
    listStudentWeakPoints(studentId),
    listRecentActivity(300),
  ]);
  if (!student) throw new Error(`student ${studentId} not found`);
  const plan = (plans as PlanWithCount[]).find((p) => p.id === student.planId) ?? null;
  const planName = plan?.name ?? null;
  const groups = memberships
    .filter((m) => m.studentId === studentId)
    .map((m) => ({ id: m.groupId, name: m.groupName }));
  const scoped = activity.filter((row) => {
    if (row.entityId === studentId) return true;
    if (row.details) {
      try {
        const parsed = JSON.parse(row.details) as { studentId?: string };
        return parsed.studentId === studentId;
      } catch {
        return false;
      }
    }
    return false;
  });
  const statement = buildStatement(plan?.amount ?? 0, student, payments);
  return {
    student,
    planName,
    groups,
    attendanceStats,
    attendanceHistory,
    payments,
    homeworks,
    exams,
    sessionAttendance,
    skills,
    weakPoints,
    activity: scoped.map((row) => ({ id: row.id, action: row.action, createdAt: row.createdAt })),
    balance: statement.totalBalance,
  };
}

function buildStatement(
  duePerMonth: number,
  student: Student,
  paymentRows: PaymentHistoryRow[],
): { totalBalance: number } {
  const payments = paymentRows.map((r) => r.payment);
  const todayIso = currentMonth();
  const { firstPeriod, endPeriod } = statementPeriods(student, payments, todayIso);
  return computeStatement(duePerMonth, payments, firstPeriod, endPeriod);
}
