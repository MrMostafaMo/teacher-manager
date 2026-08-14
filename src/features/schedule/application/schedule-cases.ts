import { groupSessionInputSchema, type GroupSessionInput } from "@/features/schedule/domain";
import {
  scheduleRepository,
  type SessionWithGroup,
} from "@/features/schedule/infrastructure/schedule-repo";
import { attendanceStatusSchema, type AttendanceStatus } from "@/features/attendance/domain";
import { groupRepository } from "@/features/groups/infrastructure/group-repo";
import { logActivity } from "@/lib/activity-log";
import { enrolledBy } from "@/lib/utils/enrollment";
import {
  groupSessions,
  sessionAttendance,
  sessionExceptions,
  type GroupSession,
  type SessionAttendance,
  type Student,
} from "@/lib/db/schema";
import { captureBy, captureRows, restoreRows } from "@/lib/db/snapshot";
import { registerUndo } from "@/lib/undo-store";
import { uuid } from "@/lib/utils/uuid";
import dayjs from "dayjs";
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

export async function deleteSession(
  id: string,
  options: { undo?: boolean } = {},
): Promise<number | null> {
  const undoEnabled = options.undo !== false;
  const sessionRows = undoEnabled ? await captureRows(groupSessions, [id]) : [];
  const attendanceRows = undoEnabled
    ? await captureBy(sessionAttendance, sessionAttendance.sessionId, id)
    : [];
  const exceptionRows = undoEnabled
    ? await captureBy(sessionExceptions, sessionExceptions.sessionId, id)
    : [];
  const removed = await scheduleRepository.remove(id);
  if (!removed) throw new Error(`session ${id} not found`);
  await scheduleRepository.clearForSession(id);
  await logActivity({ action: "schedule.delete", entityType: "schedule", entityId: id });
  if (!undoEnabled) return null;
  return registerUndo(async () => {
    await restoreRows(groupSessions, sessionRows);
    await restoreRows(sessionAttendance, attendanceRows);
    await restoreRows(sessionExceptions, exceptionRows);
  });
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
  return {
    students: students.filter((s) => s.status === "active" && enrolledBy(s, date)),
    rows,
  };
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

  // Guard the sheet: no future dates, the session must exist, and the date
  // must fall on the session's weekday — otherwise rows land under a session
  // that never runs that day.
  const today = dayjs().format("YYYY-MM-DD");
  if (parsed.date > today) throw new Error("session attendance cannot be saved for a future date");
  const session = await scheduleRepository.findById(parsed.sessionId);
  if (!session) throw new Error(`session ${parsed.sessionId} not found`);
  if (dayjs(parsed.date).day() !== session.dayOfWeek) {
    throw new Error("date does not match the session's weekday");
  }

  await scheduleRepository.replaceSessionAttendance(parsed.sessionId, parsed.date, parsed.entries);

  const counts: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const entry of parsed.entries) counts[entry.status] += 1;
  await logActivity({
    action: "schedule.attendance.save",
    entityType: "schedule",
    entityId: parsed.sessionId,
    details: { date: parsed.date, ...counts },
  });
}
