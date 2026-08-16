import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import type { SessionException } from "@/lib/db/schema";
import {
  currentMonth,
  lastMonths as sharedLastMonths,
  monthWindow,
  shiftMonth,
} from "@/lib/utils/months";

export { currentMonth, monthWindow, shiftMonth };

/** The last `n` months ending at `endMonth` (default: the current month). */
export function lastMonths(n: number, endMonth = currentMonth()): string[] {
  return sharedLastMonths(n, endMonth);
}

/** A weakness row as seen by the dashboard (resolved already normalized). */
export type WeaknessRow = {
  studentId: string;
  description: string;
  recordedOn: number;
  resolved: boolean;
};

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function percentDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Students whose enrollment (or creation) fell inside the month window. */
export function countNewStudents(
  students: Array<{ enrolledOn: string | null; createdAt: number }>,
  month: string,
): number {
  const { start, end } = monthWindow(month);
  return students.filter((s) => {
    const enrolled = s.enrolledOn ? Date.parse(s.enrolledOn) : s.createdAt;
    return Number.isFinite(enrolled) && enrolled >= start && enrolled < end;
  }).length;
}

/** Today's active sessions with a finished flag (used by the dashboard card). */
export function todaySessions(
  sessions: SessionWithGroup[],
  now: Date,
  exceptions: SessionException[] = [],
): Array<{
  id: string;
  groupName: string;
  startTime: string;
  endTime: string;
  room: string | null;
  finished: boolean;
}> {
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayExceptions = new Map<string, SessionException>();
  for (const ex of exceptions) {
    if (ex.date === todayIso) todayExceptions.set(ex.sessionId, ex);
  }
  return sessions
    .filter(
      (s) =>
        s.groupStatus === "active" &&
        s.dayOfWeek === now.getDay() &&
        (s.groupStartsOn == null || s.groupStartsOn <= todayIso) &&
        todayExceptions.get(s.id)?.type !== "cancelled",
    )
    .map((s) => {
      const ex = todayExceptions.get(s.id);
      const startTime = ex && ex.type === "moved" && ex.startTime ? ex.startTime : s.startTime;
      const endTime = ex && ex.type === "moved" && ex.endTime ? ex.endTime : s.endTime;
      const room = ex && ex.type === "moved" ? (ex.room ?? s.room) : s.room;
      return {
        id: s.id,
        groupName: s.groupName,
        startTime,
        endTime,
        room,
        finished: nowMinutes > timeToMinutes(endTime),
      };
    });
}

/**
 * Top students by unresolved weaknesses: count per student plus their most
 * recently recorded weakness. Order-independent — the latest is found by
 * recordedOn, not by input position.
 */
export function topWeaknessStudents(
  rows: WeaknessRow[],
  students: Array<{ id: string; name: string }>,
  limit = 5,
): Array<{ id: string; name: string; count: number; latest: string }> {
  const nameOf = new Map(students.map((s) => [s.id, s.name]));
  const byStudent = new Map<string, { count: number; latest: string; latestOn: number }>();
  for (const r of rows) {
    if (r.resolved) continue;
    const cur = byStudent.get(r.studentId);
    if (!cur) {
      byStudent.set(r.studentId, { count: 1, latest: r.description, latestOn: r.recordedOn });
      continue;
    }
    cur.count++;
    if (r.recordedOn > cur.latestOn) {
      cur.latest = r.description;
      cur.latestOn = r.recordedOn;
    }
  }
  return [...byStudent.entries()]
    .map(([id, { count, latest }]) => ({ id, name: nameOf.get(id) ?? "—", count, latest }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
