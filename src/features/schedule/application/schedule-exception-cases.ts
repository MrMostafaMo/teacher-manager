import dayjs from "dayjs";
import { cancelSessionSchema, moveSessionSchema } from "@/features/schedule/domain";
import { scheduleRepository } from "@/features/schedule/infrastructure/schedule-repo";
import { exceptionRepository } from "@/features/schedule/infrastructure/exception-repo";
import { logActivity } from "@/lib/activity-log";
import { uuid } from "@/lib/utils/uuid";
import type { SessionException } from "@/lib/db/schema";

/**
 * One-off schedule-exception use-cases. An exception overrides a single
 * occurrence of a recurring weekly session — either cancels it or moves it to
 * a new time/room on the same date. Writes are upserts per (session, date).
 */

export function listScheduleExceptions(): Promise<SessionException[]> {
  return exceptionRepository.list({ newestFirst: true });
}

/** Exceptions for the given session ids on the given dates. */
export function exceptionsForDates(
  sessionIds: string[],
  dates: string[],
): Promise<SessionException[]> {
  return exceptionRepository.listForDates(sessionIds, dates);
}

/** Guard that the date actually falls on the session's weekday. */
async function assertWeekday(sessionId: string, date: string): Promise<void> {
  const session = await scheduleRepository.findById(sessionId);
  if (!session) throw new Error(`session ${sessionId} not found`);
  if (dayjs(date).day() !== session.dayOfWeek) {
    throw new Error("date does not match the session's weekday");
  }
}

export async function cancelOccurrence(sessionId: string, date: string): Promise<void> {
  const parsed = cancelSessionSchema.parse({ sessionId, date });
  await assertWeekday(parsed.sessionId, parsed.date);
  await exceptionRepository.clearForSessionDate(parsed.sessionId, parsed.date);
  await exceptionRepository.insert({
    id: uuid(),
    sessionId: parsed.sessionId,
    date: parsed.date,
    type: "cancelled",
    startTime: null,
    endTime: null,
    room: null,
  });
  await logActivity({
    action: "schedule.exceptionCancel",
    entityType: "schedule",
    entityId: parsed.sessionId,
    details: { date: parsed.date },
  });
}

export async function moveOccurrence(
  sessionId: string,
  date: string,
  startTime: string,
  endTime: string,
  room?: string,
): Promise<void> {
  const parsed = moveSessionSchema.parse({ sessionId, date, startTime, endTime, room });
  await assertWeekday(parsed.sessionId, parsed.date);
  await exceptionRepository.clearForSessionDate(parsed.sessionId, parsed.date);
  await exceptionRepository.insert({
    id: uuid(),
    sessionId: parsed.sessionId,
    date: parsed.date,
    type: "moved",
    startTime: parsed.startTime,
    endTime: parsed.endTime,
    room: parsed.room ?? null,
  });
  await logActivity({
    action: "schedule.exceptionMove",
    entityType: "schedule",
    entityId: parsed.sessionId,
    details: {
      date: parsed.date,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      room: parsed.room ?? null,
    },
  });
}

export async function restoreOccurrence(exceptionId: string): Promise<void> {
  const existing = await exceptionRepository.findById(exceptionId);
  if (!existing) throw new Error(`exception ${exceptionId} not found`);
  const removed = await exceptionRepository.remove(exceptionId);
  if (!removed) throw new Error(`exception ${exceptionId} not found`);
  await logActivity({
    action: "schedule.exceptionRestore",
    entityType: "schedule",
    entityId: existing.sessionId,
    details: { date: existing.date },
  });
}
