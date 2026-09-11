import dayjs from "dayjs";
import { oneOffSessionInputSchema } from "@/features/schedule/domain";
import { exceptionRepository } from "@/features/schedule/infrastructure/exception-repo";
import { scheduleRepository } from "@/features/schedule/infrastructure/schedule-repo";
import { groupRepository } from "@/features/groups/infrastructure/group-repo";
import { groupSessions, sessionAttendance } from "@/lib/db/schema";
import type { GroupSession } from "@/lib/db/schema";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-queries";
import { captureBy, captureRows, restoreRows } from "@/lib/db/snapshot";
import { logActivity } from "@/lib/activity-log";
import { registerUndo } from "@/lib/undo-store";
import { uuid } from "@/lib/utils/uuid";
import {
  effectiveSessionsForDate,
  hasOccurrenceConflict,
  isOneOff,
} from "./schedule-one-offs";

/**
 * One-off session use-cases: extra sessions that fire on one date only, and
 * cross-day moves (cancel the source occurrence + a linked one-off row).
 * Overlaps with the same group or room block the save with
 * `OccurrenceConflictError` (mapped to a localized message in the UI).
 */

/** Thrown when a one-off save would double-book the group or the room. */
export class OccurrenceConflictError extends Error {
  constructor() {
    super("occurrence conflict");
    this.name = "OccurrenceConflictError";
  }
}

function weekdayOf(date: string): number {
  return dayjs(date).day();
}

async function assertGroupReady(groupId: string, date: string): Promise<void> {
  const group = await groupRepository.findById(groupId);
  if (!group) throw new Error(`group ${groupId} not found`);
  if (group.status !== "active") throw new Error(`group ${groupId} is not active`);
  if (group.startsOn && group.startsOn > date) {
    throw new Error(`group ${groupId} has not started yet`);
  }
}

/** Effective sessions on `date` for the conflict check. */
async function daySessions(date: string): Promise<SessionWithGroup[]> {
  const schedule = await scheduleRepository.listAll();
  const exceptions = await exceptionRepository.listForDates(
    schedule.map((s) => s.id),
    [date],
  );
  return effectiveSessionsForDate(schedule, exceptions, date);
}

export async function createOneOffSession(input: {
  groupId: string;
  date: string;
  startTime: string;
  endTime: string;
  room?: string;
}): Promise<GroupSession> {
  const parsed = oneOffSessionInputSchema.parse(input);
  if (!dayjs(parsed.date).isValid()) throw new Error(`invalid date: ${parsed.date}`);
  await assertGroupReady(parsed.groupId, parsed.date);
  const day = await daySessions(parsed.date);
  if (
    hasOccurrenceConflict(day, {
      groupId: parsed.groupId,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      room: parsed.room ?? null,
    })
  ) {
    throw new OccurrenceConflictError();
  }
  const row = await scheduleRepository.insert({
    id: uuid(),
    groupId: parsed.groupId,
    dayOfWeek: weekdayOf(parsed.date),
    startTime: parsed.startTime,
    endTime: parsed.endTime,
    room: parsed.room ?? null,
    oneOffDate: parsed.date,
    movedFromSessionId: null,
    movedFromDate: null,
  });
  await logActivity({
    action: "schedule.oneOffCreate",
    entityType: "schedule",
    entityId: row.id,
    details: { groupId: row.groupId, date: parsed.date, startTime: parsed.startTime },
  });
  return row;
}

export async function deleteOneOffSession(
  id: string,
  options: { undo?: boolean } = {},
): Promise<number | null> {
  const undoEnabled = options.undo !== false;
  const existing = await scheduleRepository.findById(id);
  if (!existing) throw new Error(`session ${id} not found`);
  if (!isOneOff(existing)) throw new Error(`session ${id} is not a one-off session`);
  const sessionRows = undoEnabled ? await captureRows(groupSessions, [id]) : [];
  const attendanceRows = undoEnabled
    ? await captureBy(sessionAttendance, sessionAttendance.sessionId, id)
    : [];
  await scheduleRepository.remove(id);
  await scheduleRepository.clearForSession(id);
  await logActivity({
    action: "schedule.oneOffDelete",
    entityType: "schedule",
    entityId: id,
    details: { groupId: existing.groupId, date: existing.oneOffDate },
  });
  if (!undoEnabled) return null;
  return registerUndo(async () => {
    await restoreRows(groupSessions, sessionRows);
    await restoreRows(sessionAttendance, attendanceRows);
  });
}
