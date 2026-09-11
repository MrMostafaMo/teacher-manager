import dayjs from "dayjs";
import { moveAcrossDaysSchema } from "@/features/schedule/domain";
import { exceptionRepository } from "@/features/schedule/infrastructure/exception-repo";
import { scheduleRepository } from "@/features/schedule/infrastructure/schedule-repo";
import { groupRepository } from "@/features/groups/infrastructure/group-repo";
import { groupSessions, sessionAttendance, sessionExceptions } from "@/lib/db/schema";
import { captureBy, captureRows, restoreRows } from "@/lib/db/snapshot";
import { logActivity } from "@/lib/activity-log";
import { registerUndo } from "@/lib/undo-store";
import { uuid } from "@/lib/utils/uuid";
import {
  effectiveSessionsForDate,
  hasOccurrenceConflict,
  isOneOff,
} from "./schedule-one-offs";
import { OccurrenceConflictError } from "./schedule-oneoff-cases";

/**
 * Cross-day move: one occurrence shifts to another date (e.g. Sunday →
 * Monday for one week only). Implemented as a `cancelled` exception on the
 * source pair plus a linked one-off row on the target date, undone together.
 */

export async function moveOccurrenceAcrossDays(input: {
  sessionId: string;
  date: string;
  targetDate: string;
  startTime: string;
  endTime: string;
  room?: string;
}): Promise<number | null> {
  const parsed = moveAcrossDaysSchema.parse(input);
  if (!dayjs(parsed.date).isValid()) throw new Error(`invalid date: ${parsed.date}`);
  if (!dayjs(parsed.targetDate).isValid()) throw new Error(`invalid date: ${parsed.targetDate}`);
  const source = await scheduleRepository.findById(parsed.sessionId);
  if (!source) throw new Error(`session ${parsed.sessionId} not found`);
  if (isOneOff(source)) throw new Error(`session ${parsed.sessionId} is not a weekly session`);
  if (dayjs(parsed.date).day() !== source.dayOfWeek) {
    throw new Error("date does not match the session's weekday");
  }
  const group = await groupRepository.findById(source.groupId);
  if (!group) throw new Error(`group ${source.groupId} not found`);
  if (group.status !== "active") throw new Error(`group ${source.groupId} is not active`);
  if (group.startsOn && group.startsOn > parsed.targetDate) {
    throw new Error(`group ${source.groupId} has not started yet`);
  }
  const schedule = await scheduleRepository.listAll();
  const exceptions = await exceptionRepository.listForDates(
    schedule.map((s) => s.id),
    [parsed.targetDate],
  );
  const priorSourceExceptions = await exceptionRepository.listForDates([source.id], [parsed.date]);
  const priorRows =
    priorSourceExceptions.length > 0 ? await captureRows(sessionExceptions, priorSourceExceptions.map((e) => e.id)) : [];
  if (
    hasOccurrenceConflict(effectiveSessionsForDate(schedule, exceptions, parsed.targetDate), {
      groupId: source.groupId,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      room: parsed.room ?? null,
    })
  ) {
    throw new OccurrenceConflictError();
  }
  await exceptionRepository.clearForSessionDate(source.id, parsed.date);
  await exceptionRepository.insert({
    id: uuid(),
    sessionId: source.id,
    date: parsed.date,
    type: "cancelled",
    startTime: null,
    endTime: null,
    room: null,
  });
  const oneOffId = uuid();
  await scheduleRepository.insert({
    id: oneOffId,
    groupId: source.groupId,
    dayOfWeek: dayjs(parsed.targetDate).day(),
    startTime: parsed.startTime,
    endTime: parsed.endTime,
    room: parsed.room ?? null,
    oneOffDate: parsed.targetDate,
    movedFromSessionId: source.id,
    movedFromDate: parsed.date,
  });
  await logActivity({
    action: "schedule.exceptionMoveDay",
    entityType: "schedule",
    entityId: source.id,
    details: {
      date: parsed.date,
      targetDate: parsed.targetDate,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      room: parsed.room ?? null,
    },
  });
  return registerUndo(async () => {
    await scheduleRepository.remove(oneOffId);
    await scheduleRepository.clearForSession(oneOffId);
    await exceptionRepository.clearForSessionDate(source.id, parsed.date);
    await restoreRows(sessionExceptions, priorRows);
  });
}

/**
 * Undo a cross-day move: the linked one-off (and its sheet, like any delete)
 * goes away and the source occurrence is un-cancelled.
 */
export async function restoreMovedOccurrence(oneOffId: string): Promise<number | null> {
  const row = await scheduleRepository.findById(oneOffId);
  if (!row) throw new Error(`session ${oneOffId} not found`);
  if (!isOneOff(row) || !row.movedFromSessionId || !row.movedFromDate) {
    throw new Error(`session ${oneOffId} is not a moved occurrence`);
  }
  const sessionRows = await captureRows(groupSessions, [oneOffId]);
  const attendanceRows = await captureBy(sessionAttendance, sessionAttendance.sessionId, oneOffId);
  const cancelled = await exceptionRepository.listForDates([row.movedFromSessionId], [row.movedFromDate]);
  const cancelledRows = cancelled.filter((e) => e.type === "cancelled");
  const exceptionRows =
    cancelledRows.length > 0 ? await captureRows(sessionExceptions, cancelledRows.map((e) => e.id)) : [];
  await scheduleRepository.remove(oneOffId);
  await scheduleRepository.clearForSession(oneOffId);
  for (const ex of cancelledRows) await exceptionRepository.remove(ex.id);
  await logActivity({
    action: "schedule.exceptionRestore",
    entityType: "schedule",
    entityId: row.movedFromSessionId,
    details: { date: row.movedFromDate },
  });
  return registerUndo(async () => {
    await restoreRows(groupSessions, sessionRows);
    await restoreRows(sessionAttendance, attendanceRows);
    await restoreRows(sessionExceptions, exceptionRows);
  });
}
