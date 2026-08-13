import dayjs from "dayjs";
import type { SessionException } from "@/lib/db/schema";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-queries";

/**
 * Pure logic for one-off schedule exceptions — no DB access. Everything here
 * is unit-tested; the use-cases and UI call these helpers and the repository.
 */

/** Exception info attached to a session for the date it applies to. */
export interface SessionExceptionFlag {
  id: string;
  type: "cancelled" | "moved";
  date: string;
  startTime: string | null;
  endTime: string | null;
  room: string | null;
}

export type SessionWithException = SessionWithGroup & {
  exception?: SessionExceptionFlag;
};

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Lay exceptions onto the week buckets. A cancelled occurrence keeps its slot
 * but is flagged; a moved occurrence is repositioned to its effective time and
 * flagged. Only the exact (session, date) pair is affected.
 */
export function applyExceptions(
  byDay: SessionWithGroup[][],
  exceptions: SessionException[],
  dates: Date[],
): SessionWithException[][] {
  const byKey = new Map<string, SessionException>();
  for (const ex of exceptions) byKey.set(`${ex.sessionId}|${ex.date}`, ex);

  return byDay.map((day, i) => {
    const date = toIso(dates[i] ?? new Date());
    return day.map((session) => {
      const ex = byKey.get(`${session.id}|${date}`);
      if (!ex) return session;
      const flag: SessionExceptionFlag = {
        id: ex.id,
        type: ex.type,
        date: ex.date,
        startTime: ex.startTime,
        endTime: ex.endTime,
        room: ex.room,
      };
      if (ex.type === "moved" && ex.startTime && ex.endTime) {
        return {
          ...session,
          exception: flag,
          startTime: ex.startTime,
          endTime: ex.endTime,
          room: ex.room ?? session.room,
        };
      }
      return { ...session, exception: flag };
    });
  });
}

/**
 * Ids of sessions that overlap another session in the same room within a day.
 * Times are zero-padded "HH:mm", so string comparison gives the right order.
 */
export function conflictIds(byDay: SessionWithGroup[][]): Set<string> {
  const ids = new Set<string>();
  for (const day of byDay) {
    const byRoom = new Map<string, SessionWithGroup[]>();
    for (const s of day) {
      if (!s.room) continue;
      const list = byRoom.get(s.room);
      if (list) list.push(s);
      else byRoom.set(s.room, [s]);
    }
    for (const room of byRoom.values()) {
      for (let i = 0; i < room.length; i++) {
        for (let j = i + 1; j < room.length; j++) {
          const a = room[i];
          const b = room[j];
          if (a.startTime < b.endTime && b.startTime < a.endTime) {
            ids.add(a.id);
            ids.add(b.id);
          }
        }
      }
    }
  }
  return ids;
}

/**
 * Group ids that have at least one session on `date`'s weekday that is not
 * cancelled that date (active groups whose start date has passed only).
 */
export function activeGroupIdsForDate(
  sessions: SessionWithGroup[],
  exceptions: SessionException[],
  date: string,
): Set<string> {
  const day = dayjs(date).day();
  const cancelled = new Set(
    exceptions
      .filter((ex) => ex.type === "cancelled" && ex.date === date)
      .map((ex) => ex.sessionId),
  );
  const ids = new Set<string>();
  for (const s of sessions) {
    if (
      s.dayOfWeek === day &&
      s.groupStatus === "active" &&
      (s.groupStartsOn == null || s.groupStartsOn <= date) &&
      !cancelled.has(s.id)
    ) {
      ids.add(s.groupId);
    }
  }
  return ids;
}
