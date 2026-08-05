import { groupSessionInputSchema, type GroupSessionInput } from "@/features/schedule/domain";
import {
  scheduleRepository,
  type SessionWithGroup,
} from "@/features/schedule/infrastructure/schedule-repo";
import { attendanceStatusSchema, type AttendanceStatus } from "@/features/attendance/domain";
import { groupRepository } from "@/features/groups/infrastructure/group-repo";
import { logActivity } from "@/lib/activity-log";
import type { GroupSession, SessionAttendance, Student } from "@/lib/db/schema";
import { uuid } from "@/lib/utils/uuid";
import { z } from "zod";

/**
 * Weekly-timetable use-cases. Validate input, write through the repository,
 * and record each mutation in the activity log.
 */

export function listSchedule(): Promise<SessionWithGroup[]> {
  return scheduleRepository.listAll();
}

export async function createSession(input: GroupSessionInput): Promise<GroupSession> {
  const parsed = groupSessionInputSchema.parse(input);
  const row = await scheduleRepository.insert({ id: uuid(), ...parsed });
  await logActivity({
    action: "schedule.create",
    entityType: "schedule",
    entityId: row.id,
    details: { groupId: row.groupId, dayOfWeek: row.dayOfWeek, startTime: row.startTime },
  });
  return row;
}

export async function updateSession(id: string, input: GroupSessionInput): Promise<GroupSession> {
  const parsed = groupSessionInputSchema.parse(input);
  const row = await scheduleRepository.update(id, parsed);
  if (!row) throw new Error(`session ${id} not found`);
  await logActivity({
    action: "schedule.update",
    entityType: "schedule",
    entityId: row.id,
    details: { groupId: row.groupId, dayOfWeek: row.dayOfWeek, startTime: row.startTime },
  });
  return row;
}

export async function deleteSession(id: string): Promise<void> {
  const removed = await scheduleRepository.remove(id);
  if (!removed) throw new Error(`session ${id} not found`);
  await scheduleRepository.clearForSession(id);
  await logActivity({ action: "schedule.delete", entityType: "schedule", entityId: id });
}

export interface SessionAttendanceSheet {
  students: Student[];
  rows: SessionAttendance[];
}

/** Members of the session's group + any saved attendance for (session, date). */
export async function getSessionAttendance(
  session: Pick<GroupSession, "id" | "groupId">,
  date: string,
): Promise<SessionAttendanceSheet> {
  const [students, rows] = await Promise.all([
    groupRepository.members(session.groupId),
    scheduleRepository.sessionAttendanceBy(session.id, date),
  ]);
  return { students, rows };
}

const sessionAttendanceInputSchema = z.object({
  sessionId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entries: z.array(z.object({ studentId: z.string().min(1), status: attendanceStatusSchema })).max(1000),
});

export async function saveSessionAttendance(input: {
  sessionId: string;
  date: string;
  entries: Array<{ studentId: string; status: AttendanceStatus }>;
}): Promise<void> {
  const parsed = sessionAttendanceInputSchema.parse(input);
  if (parsed.entries.length === 0) return;

  await scheduleRepository.replaceSessionAttendance(parsed.sessionId, parsed.date, parsed.entries);

  const counts: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0 };
  for (const entry of parsed.entries) counts[entry.status] += 1;
  await logActivity({
    action: "schedule.attendance.save",
    entityType: "schedule",
    entityId: parsed.sessionId,
    details: { date: parsed.date, ...counts },
  });
}
