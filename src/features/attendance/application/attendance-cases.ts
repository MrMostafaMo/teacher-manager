import dayjs from "dayjs";
import { saveAttendanceSchema, type AttendanceStatus } from "@/features/attendance/domain";
import { attendanceRepository } from "@/features/attendance/infrastructure/attendance-repo";
import { studentRepository } from "@/features/students/infrastructure/student-repo";
import { groupRepository } from "@/features/groups/infrastructure/group-repo";
import { listSchedule } from "@/features/schedule/application/schedule-cases";
import { logActivity } from "@/lib/activity-log";
import { enrolledBy, monthEnd } from "@/lib/utils/enrollment";
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

/** Members of the groups with a session on `date`'s weekday + whether any exist. */
async function rosterForDate(date: string): Promise<{ students: Student[]; hasSessionsToday: boolean }> {
  const day = dayjs(date).day();
  const schedule = await listSchedule();
  const groupIds = [
    ...new Set(
      schedule
        .filter(
          (s) =>
            s.dayOfWeek === day &&
            s.groupStatus === "active" &&
            (s.groupStartsOn == null || s.groupStartsOn <= date),
        )
        .map((s) => s.groupId),
    ),
  ];
  if (groupIds.length === 0) return { students: [], hasSessionsToday: false };
  const members = await Promise.all(groupIds.map((id) => groupRepository.members(id)));
  const byId = new Map<string, Student>();
  for (const list of members) {
    for (const s of list) if (s.status === "active") byId.set(s.id, s);
  }
  return {
    students: [...byId.values()]
      .filter((s) => enrolledBy(s, date))
      .sort((a, b) => a.name.localeCompare(b.name)),
    hasSessionsToday: true,
  };
}

/**
 * Auto status for students without a saved row. A student is only defaulted
 * to "present" once their earliest session of the day has started; past days
 * default everything, future days default nothing.
 */
async function defaultStatuses(
  date: string,
  students: Student[],
  groupId?: string,
): Promise<Record<string, AttendanceStatus | undefined>> {
  const today = dayjs().format("YYYY-MM-DD");
  if (date < today) {
    const defaults: Record<string, AttendanceStatus | undefined> = {};
    for (const s of students) defaults[s.id] = "present";
    return defaults;
  }
  if (date > today) return {};

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const schedule = await listSchedule();
  const startByGroup = new Map<string, number>();
  for (const s of schedule) {
    if (
      s.dayOfWeek !== dayjs(date).day() ||
      s.groupStatus !== "active" ||
      (s.groupStartsOn != null && s.groupStartsOn > date)
    )
      continue;
    const [h, m] = s.startTime.split(":").map(Number);
    const minutes = h * 60 + m;
    const cur = startByGroup.get(s.groupId);
    if (cur === undefined || minutes < cur) startByGroup.set(s.groupId, minutes);
  }

  if (groupId) {
    const defaults: Record<string, AttendanceStatus | undefined> = {};
    if ((startByGroup.get(groupId) ?? Infinity) <= nowMinutes) {
      for (const s of students) defaults[s.id] = "present";
    }
    return defaults;
  }

  const memberships = await groupRepository.memberships();
  const groupsByStudent = new Map<string, string[]>();
  for (const m of memberships) {
    const arr = groupsByStudent.get(m.studentId) ?? [];
    arr.push(m.groupId);
    groupsByStudent.set(m.studentId, arr);
  }

  const defaults: Record<string, AttendanceStatus | undefined> = {};
  for (const s of students) {
    const earliest = (groupsByStudent.get(s.id) ?? []).reduce<number>(
      (min, gid) => Math.min(min, startByGroup.get(gid) ?? Infinity),
      Infinity,
    );
    if (earliest <= nowMinutes) defaults[s.id] = "present";
  }
  return defaults;
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
