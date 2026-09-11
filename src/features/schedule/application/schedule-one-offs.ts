import dayjs from "dayjs";
import type { SessionException } from "@/lib/db/schema";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-queries";
import { toIso, type SessionWithException } from "./schedule-exceptions";

/**
 * Pure logic for one-off sessions — rows of `group_sessions` with
 * `oneOffDate` set that fire on that date only, never weekly. No DB access;
 * everything here is unit-tested.
 */

/** True when the row is a one-off session (fires on `oneOffDate` only). */
export function isOneOff(s: Pick<SessionWithGroup, "oneOffDate">): boolean {
  return s.oneOffDate != null && s.oneOffDate !== "";
}

/** Group session takes effect on `date` (NULL/empty start = no bound). */
function startsOk(s: Pick<SessionWithGroup, "groupStartsOn">, date: string): boolean {
  return s.groupStartsOn == null || s.groupStartsOn === "" || s.groupStartsOn <= date;
}

/** Split timetable rows into recurring weekly sessions and one-off sessions. */
export function splitOccurrences(sessions: SessionWithGroup[]): {
  recurring: SessionWithGroup[];
  oneOffs: SessionWithGroup[];
} {
  const recurring: SessionWithGroup[] = [];
  const oneOffs: SessionWithGroup[] = [];
  for (const s of sessions) (isOneOff(s) ? oneOffs : recurring).push(s);
  return { recurring, oneOffs };
}

/**
 * Effective sessions firing on `date`: recurring sessions of that weekday
 * (minus cancelled, with moved times applied) plus one-offs of that date.
 */
export function effectiveSessionsForDate(
  sessions: SessionWithGroup[],
  exceptions: SessionException[],
  date: string,
): SessionWithGroup[] {
  const day = dayjs(date).day();
  const byKey = new Map(exceptions.map((ex) => [`${ex.sessionId}|${ex.date}`, ex]));
  const out: SessionWithGroup[] = [];
  for (const s of sessions) {
    if (s.groupStatus !== "active" || !startsOk(s, date)) continue;
    if (isOneOff(s)) {
      if (s.oneOffDate === date) out.push(s);
      continue;
    }
    if (s.dayOfWeek !== day) continue;
    const ex = byKey.get(`${s.id}|${date}`);
    if (ex?.type === "cancelled") continue;
    if (ex?.type === "moved" && ex.startTime && ex.endTime) {
      out.push({ ...s, startTime: ex.startTime, endTime: ex.endTime, room: ex.room ?? s.room });
      continue;
    }
    out.push(s);
  }
  return out;
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export interface OccurrenceCandidate {
  id?: string;
  groupId: string;
  startTime: string;
  endTime: string;
  room: string | null;
}

/**
 * True when the candidate overlaps another effective session of the same
 * group or the same room (self excluded). Times are zero-padded "HH:mm" so
 * string comparison gives the right order.
 */
export function hasOccurrenceConflict(
  daySessions: SessionWithGroup[],
  candidate: OccurrenceCandidate,
): boolean {
  for (const s of daySessions) {
    if (candidate.id != null && s.id === candidate.id) continue;
    if (!overlaps(s.startTime, s.endTime, candidate.startTime, candidate.endTime)) continue;
    if (s.groupId === candidate.groupId) return true;
    if (candidate.room != null && candidate.room !== "" && s.room === candidate.room) return true;
  }
  return false;
}

/**
 * Inject one-off sessions into the week buckets by their exact date. Mirrors
 * `applyExceptions` bucket mapping: with `daysOrder` each bucket maps to its
 * real date, otherwise positionally. Days stay sorted by start time.
 */
export function injectOneOffs(
  byDay: SessionWithException[][],
  oneOffs: SessionWithGroup[],
  dates: Date[],
  daysOrder?: number[],
): SessionWithException[][] {
  const isoDates = dates.map(toIso);
  const out = byDay.map((day) => [...day]);
  for (const one of oneOffs) {
    if (!one.oneOffDate) continue;
    const pos = isoDates.indexOf(one.oneOffDate);
    if (pos === -1) continue;
    const day = daysOrder ? daysOrder[pos] : pos;
    if (day == null || !out[day]) continue;
    out[day].push(one);
  }
  for (const day of out) {
    day.sort(
      (a, b) => a.startTime.localeCompare(b.startTime) || a.groupName.localeCompare(b.groupName),
    );
  }
  return out;
}

/** One-off sessions of a group on/after `today`, soonest first. */
export function upcomingOneOffs(
  sessions: SessionWithGroup[],
  groupId: string,
  today: string,
): SessionWithGroup[] {
  return sessions
    .filter((s) => isOneOff(s) && s.groupId === groupId && (s.oneOffDate ?? "") >= today)
    .sort((a, b) => (a.oneOffDate ?? "").localeCompare(b.oneOffDate ?? ""));
}

/** Ids of groups with a one-off session exactly on `date`. */
export function groupIdsWithOneOffs(sessions: SessionWithGroup[], date: string): Set<string> {
  const ids = new Set<string>();
  for (const s of sessions) {
    if (!isOneOff(s) || s.oneOffDate !== date) continue;
    if (s.groupStatus !== "active" || !startsOk(s, date)) continue;
    ids.add(s.groupId);
  }
  return ids;
}
