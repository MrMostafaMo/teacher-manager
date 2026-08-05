import { saveAttendanceSchema, type AttendanceStatus } from "@/features/attendance/domain";
import { attendanceRepository } from "@/features/attendance/infrastructure/attendance-repo";
import { studentRepository } from "@/features/students/infrastructure/student-repo";
import { groupRepository } from "@/features/groups/infrastructure/group-repo";
import { logActivity } from "@/lib/activity-log";
import type { Attendance, Student } from "@/lib/db/schema";

/**
 * Attendance use-cases. Attendance is tracked per student per date (the
 * `attendance_student_date` unique constraint), so the daily sheet lists the
 * roster — every active student, or one group's members when a group filter
 * is set — and the save persists one row per student.
 */

export interface DailyAttendance {
  students: Student[];
  rows: Attendance[];
}

export async function getDaily(date: string, groupId?: string): Promise<DailyAttendance> {
  const [students, rows] = await Promise.all([
    groupId ? groupRepository.members(groupId) : studentRepository.search({ status: "active" }),
    attendanceRepository.byDate(date),
  ]);
  return { students, rows };
}

export interface StudentMonthlyRow {
  studentId: string;
  name: string;
  present: number;
  absent: number;
  late: number;
  /** Group-session sheets, kept separate from the daily counts. */
  sessionPresent: number;
  sessionAbsent: number;
  sessionLate: number;
}

export async function getMonthly(month: string): Promise<StudentMonthlyRow[]> {
  const [students, stats, sessionStats] = await Promise.all([
    studentRepository.search({ status: "active" }),
    attendanceRepository.monthlyStats(month),
    attendanceRepository.sessionMonthlyStats(month),
  ]);
  const byId = new Map(stats.map((s) => [s.studentId, s]));
  const sessionById = new Map(sessionStats.map((s) => [s.studentId, s]));
  return students.map((s) => {
    const stat = byId.get(s.id);
    const session = sessionById.get(s.id);
    return {
      studentId: s.id,
      name: s.name,
      present: stat?.present ?? 0,
      absent: stat?.absent ?? 0,
      late: stat?.late ?? 0,
      sessionPresent: session?.present ?? 0,
      sessionAbsent: session?.absent ?? 0,
      sessionLate: session?.late ?? 0,
    };
  });
}

export async function saveDaily(input: {
  date: string;
  entries: Array<{ studentId: string; status: AttendanceStatus }>;
}): Promise<void> {
  const parsed = saveAttendanceSchema.parse(input);
  if (parsed.entries.length === 0) return;

  for (const entry of parsed.entries) {
    await attendanceRepository.upsert(entry.studentId, parsed.date, entry.status);
  }

  const counts: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0 };
  for (const entry of parsed.entries) counts[entry.status] += 1;
  await logActivity({
    action: "attendance.save",
    entityType: "attendance",
    details: { date: parsed.date, ...counts },
  });
}
