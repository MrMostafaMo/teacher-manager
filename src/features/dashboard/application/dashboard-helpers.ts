import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import type { SessionException } from "@/lib/db/schema";

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function previousMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** ISO month keys for the last `n` months, oldest first. */
export function lastMonths(n: number): string[] {
  const months: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const dd = new Date(d.getFullYear(), d.getMonth() - i, 1);
    months.push(`${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

export function percentDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** [start, end) unix-ms window for an ISO YYYY-MM month. */
export function monthWindow(month: string): { start: number; end: number } {
  const prefix = month.slice(0, 7);
  const start = Date.parse(`${prefix}-01T00:00:00`);
  const d = new Date(start);
  d.setMonth(d.getMonth() + 1);
  return { start, end: d.getTime() };
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
