import dayjs from "dayjs";
import { saveAttendanceSchema, type AttendanceStatus } from "@/features/attendance/domain";
import { attendanceRepository } from "@/features/attendance/infrastructure/attendance-repo";
import { studentRepository } from "@/features/students/infrastructure/student-repo";
import { groupRepository } from "@/features/groups/infrastructure/group-repo";
import { logActivity } from "@/lib/activity-log";
import { enrolledBy, monthEnd } from "@/lib/utils/enrollment";
import type { Attendance, Student } from "@/lib/db/schema";
import { rosterForDate } from "./attendance-roster";
import { defaultStatuses } from "./attendance-defaults";

/**
 * Attendance use-cases. Attendance is tracked per student per date (the
 * `attendance_student_date` unique constraint), so the daily sheet lists the
 * roster — every active student, or one group's members when a group filter
 * is set — and the save persists one row per student.
 */

export interface DailyAttendance {
  students: Student[];
  rows: Attendance[];
  /** True when the no-filter roster comes from the day's scheduled groups. */
  hasSessionsToday: boolean;
  /**
   * Per-student automatic status for unrecorded students: "present" only once
   * the student's earliest session of the day has started (or the date is in
   * the past). Undefined until then — never auto-recorded for future days.
   */
  defaults: Record<string, AttendanceStatus | undefined>;
}

export async function getDaily(date: string, groupId?: string): Promise<DailyAttendance> {
  const roster = groupId
    ? {
        students: (await groupRepository.members(groupId)).filter(
          (s) => s.status === "active" && enrolledBy(s, date),
        ),
        hasSessionsToday: true,
      }
    : await rosterForDate(date);
  const [rows, defaults] = await Promise.all([
    attendanceRepository.byDate(date),
    defaultStatuses(date, roster.students, groupId),
  ]);
  return { students: roster.students, rows, hasSessionsToday: roster.hasSessionsToday, defaults };
}

export interface StudentMonthlyRow {
  studentId: string;
  name: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
}

export async function getMonthly(month: string): Promise<StudentMonthlyRow[]> {
  const monthEndDate = monthEnd(month);
  const [students, stats] = await Promise.all([
    studentRepository.search({ status: "active" }),
    attendanceRepository.monthlyStats(month),
  ]);
  const byId = new Map(stats.map((s) => [s.studentId, s]));
  return students.filter((s) => enrolledBy(s, monthEndDate)).map((s) => {
    const stat = byId.get(s.id);
    return {
      studentId: s.id,
      name: s.name,
      present: stat?.present ?? 0,
      absent: stat?.absent ?? 0,
      late: stat?.late ?? 0,
      excused: stat?.excused ?? 0,
    };
  });
}

export async function saveDaily(input: {
  date: string;
  entries: Array<{ studentId: string; status: AttendanceStatus }>;
}): Promise<void> {
  const parsed = saveAttendanceSchema.parse(input);
  if (parsed.entries.length === 0) return;
  // Never record attendance for a day that hasn't started yet — nothing may be
  // persisted (or logged) before the day's sessions begin.
  if (parsed.date > dayjs().format("YYYY-MM-DD")) {
    throw new Error(`cannot record attendance for a future date: ${parsed.date}`);
  }

  for (const entry of parsed.entries) {
    await attendanceRepository.upsert(entry.studentId, parsed.date, entry.status);
  }

  const counts: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const entry of parsed.entries) counts[entry.status] += 1;
  await logActivity({
    action: "attendance.save",
    entityType: "attendance",
    details: { date: parsed.date, ...counts },
  });
}
