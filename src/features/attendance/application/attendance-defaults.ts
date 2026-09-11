import dayjs from "dayjs";
import { groupRepository } from "@/features/groups/infrastructure/group-repo";
import { listSchedule } from "@/features/schedule/application/schedule-cases";
import { exceptionsForDates } from "@/features/schedule/application/schedule-exception-cases";
import { isOneOff } from "@/features/schedule/application/schedule-one-offs";
import type { AttendanceStatus } from "@/features/attendance/domain";
import type { Student } from "@/lib/db/schema";

/**
 * Auto status for students without a saved row. A student is only defaulted
 * to "present" once their earliest session of the day has started; past days
 * default everything, future days default nothing.
 */
export async function defaultStatuses(
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
  // Cancelled occurrences don't auto-default; moved ones use effective time.
  // Exceptions are best-effort (tests mock the schedule without a DB).
  const exceptions = await exceptionsForDates(
    schedule.map((s) => s.id),
    [date],
  ).catch(() => []);
  const bySessionDate = new Map(exceptions.map((ex) => [`${ex.sessionId}|${ex.date}`, ex]));
  const startByGroup = new Map<string, number>();
  for (const s of schedule) {
    // One-offs fire on their exact date, never on the weekday rule.
    if (isOneOff(s) ? s.oneOffDate !== date : s.dayOfWeek !== dayjs(date).day()) continue;
    if (
      s.groupStatus !== "active" ||
      (s.groupStartsOn != null && s.groupStartsOn !== "" && s.groupStartsOn > date)
    )
      continue;
    const ex = bySessionDate.get(`${s.id}|${date}`);
    if (ex?.type === "cancelled") continue;
    const effectiveStart = ex?.type === "moved" && ex.startTime ? ex.startTime : s.startTime;
    const [h, m] = effectiveStart.split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) continue;
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
