import dayjs from "dayjs";
import { groupRepository } from "@/features/groups/infrastructure/group-repo";
import { listSchedule } from "@/features/schedule/application/schedule-cases";
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
