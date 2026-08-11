import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import { DAYS } from "@/features/schedule/domain";

/** Height of one hour in the grid, in px. */
export const HOUR_PX = 44;
/** Width of the time gutter (matches the grid template's first column). */
export const GUTTER_W = "56px";
/** Floor so tiny sessions stay visible even when their slot is very short. */
export const MIN_BLOCK_H = 24;
/** Approximate height of one text line inside a block (11–12px font, tight leading). */
export const LINE_H = 14;
/** Vertical padding (p-1.5 top+bottom) plus border, in px. */
export const BLOCK_PAD = 14;
/** Cap so the min height never balloons past ~1h of grid space. */
export const MAX_BLOCK_H = 52;
/** Extra height granted while the delete-confirm chip is shown. */
export const CHIP_H = 30;

/** Fallback time window (07:00–22:00) when there are no sessions yet. */
const DEFAULT_START = 7 * 60;
const DEFAULT_END = 22 * 60;
/** Enforce at least this many visible hours so the grid never looks cramped. */
const MIN_SPAN = 10 * 60;

/**
 * Per-group block palette (literal classes so Tailwind keeps them).
 * A group keeps one color across the whole grid (stable hash of its id).
 */
export const PALETTE = [
  { bg: "bg-blue-500/10 dark:bg-blue-500/20", border: "border-blue-500/40", bar: "bg-blue-500" },
  { bg: "bg-emerald-500/10 dark:bg-emerald-500/20", border: "border-emerald-500/40", bar: "bg-emerald-500" },
  { bg: "bg-amber-500/10 dark:bg-amber-500/20", border: "border-amber-500/40", bar: "bg-amber-500" },
  { bg: "bg-violet-500/10 dark:bg-violet-500/20", border: "border-violet-500/40", bar: "bg-violet-500" },
  { bg: "bg-rose-500/10 dark:bg-rose-500/20", border: "border-rose-500/40", bar: "bg-rose-500" },
  { bg: "bg-sky-500/10 dark:bg-sky-500/20", border: "border-sky-500/40", bar: "bg-sky-500" },
  { bg: "bg-orange-500/10 dark:bg-orange-500/20", border: "border-orange-500/40", bar: "bg-orange-500" },
  { bg: "bg-teal-500/10 dark:bg-teal-500/20", border: "border-teal-500/40", bar: "bg-teal-500" },
] as const;

export function paletteFor(groupId: string) {
  let hash = 0;
  for (let i = 0; i < groupId.length; i++) hash = (hash * 31 + groupId.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

/** "HH:mm" → minutes since midnight. */
export function toMin(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Minutes → "HH:mm" (on the hour) for the gutter labels. */
export function toLabel(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:00`;
}

/**
 * Minimum height for a session block so its content stays readable: the group
 * name + time lines always fit, plus a room/conflict line when present. Capped
 * so a short session never balloons across the whole grid.
 */
export function minBlockHeight(lines: number): number {
  return Math.min(Math.max(MIN_BLOCK_H, lines * LINE_H + BLOCK_PAD), MAX_BLOCK_H);
}

/** Visible time window derived from the sessions, rounded to full hours. */
export function rangeFor(byDay: SessionWithGroup[][]): [number, number] {
  let start = Infinity;
  let end = -Infinity;
  for (const day of byDay) {
    for (const s of day) {
      start = Math.min(start, toMin(s.startTime));
      end = Math.max(end, toMin(s.endTime));
    }
  }
  if (!Number.isFinite(start)) return [DEFAULT_START, DEFAULT_END];
  const s = Math.floor(start / 60) * 60;
  let e = Math.ceil(end / 60) * 60;
  if (e - s < MIN_SPAN) e = Math.min(24 * 60, s + MIN_SPAN);
  return [s, Math.max(e, s + 60)];
}

/** Dates of the week containing `now` (plus `offset` weeks), anchored on the configured first day. */
export function weekDates(now: Date, weekStartsOn: number, offset = 0): Date[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - ((now.getDay() - weekStartsOn + 7) % 7) + offset * 7);
  return DAYS.map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export const gridTemplate = { gridTemplateColumns: `${GUTTER_W} repeat(7, minmax(0, 1fr))` } as const;

export interface PlacedSession {
  session: SessionWithGroup;
  col: number;
  cols: number;
}

/**
 * Greedy column assignment + a second pass that counts, per session, how many
 * columns hold an overlapping session — so overlaps render side-by-side with
 * proportional widths, while non-overlapping sessions stay full-width.
 */
export function layoutDay(sessions: SessionWithGroup[]): PlacedSession[] {
  const sorted = [...sessions].sort(
    (a, b) => toMin(a.startTime) - toMin(b.startTime) || toMin(b.endTime) - toMin(a.endTime),
  );
  const colEnds: number[] = [];
  const columns: SessionWithGroup[][] = [];
  for (const s of sorted) {
    const start = toMin(s.startTime);
    let col = colEnds.findIndex((end) => end <= start);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(0);
      columns.push([]);
    }
    colEnds[col] = Math.max(colEnds[col], toMin(s.endTime));
    columns[col].push(s);
  }
  return sorted.map((s) => {
    const start = toMin(s.startTime);
    const end = toMin(s.endTime);
    let col = -1;
    let cols = 0;
    columns.forEach((list, i) => {
      if (list.some((o) => toMin(o.startTime) < end && start < toMin(o.endTime))) cols++;
      if (list.includes(s)) col = i;
    });
    return { session: s, col, cols: Math.max(cols, 1) };
  });
}
