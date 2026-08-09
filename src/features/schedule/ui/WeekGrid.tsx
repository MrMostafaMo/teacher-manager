import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CalendarCheck, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import type { GroupSession } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils/format";
import { useTimeStore } from "@/lib/time-store";
import { orderedDayIndices, useWeekStore } from "@/lib/week-store";

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/** Height of one hour in the grid, in px. */
const HOUR_PX = 44;
/** Width of the time gutter (matches the grid template's first column). */
const GUTTER_W = "56px";
/** Floor so tiny sessions stay visible even when their slot is very short. */
const MIN_BLOCK_H = 24;
/** Approximate height of one text line inside a block (11–12px font, tight leading). */
const LINE_H = 14;
/** Vertical padding (p-1.5 top+bottom) plus border, in px. */
const BLOCK_PAD = 14;
/** Cap so the min height never balloons past ~1h of grid space. */
const MAX_BLOCK_H = 52;
/** Extra height granted while the delete-confirm chip is shown. */
const CHIP_H = 30;

/** Fallback time window (07:00–22:00) when there are no sessions yet. */
const DEFAULT_START = 7 * 60;
const DEFAULT_END = 22 * 60;
/** Enforce at least this many visible hours so the grid never looks cramped. */
const MIN_SPAN = 10 * 60;

/**
 * Per-group block palette (literal classes so Tailwind keeps them).
 * A group keeps one color across the whole grid (stable hash of its id).
 */
const PALETTE = [
  { bg: "bg-blue-500/10 dark:bg-blue-500/20", border: "border-blue-500/40", bar: "bg-blue-500" },
  { bg: "bg-emerald-500/10 dark:bg-emerald-500/20", border: "border-emerald-500/40", bar: "bg-emerald-500" },
  { bg: "bg-amber-500/10 dark:bg-amber-500/20", border: "border-amber-500/40", bar: "bg-amber-500" },
  { bg: "bg-violet-500/10 dark:bg-violet-500/20", border: "border-violet-500/40", bar: "bg-violet-500" },
  { bg: "bg-rose-500/10 dark:bg-rose-500/20", border: "border-rose-500/40", bar: "bg-rose-500" },
  { bg: "bg-sky-500/10 dark:bg-sky-500/20", border: "border-sky-500/40", bar: "bg-sky-500" },
  { bg: "bg-orange-500/10 dark:bg-orange-500/20", border: "border-orange-500/40", bar: "bg-orange-500" },
  { bg: "bg-teal-500/10 dark:bg-teal-500/20", border: "border-teal-500/40", bar: "bg-teal-500" },
] as const;

function paletteFor(groupId: string) {
  let hash = 0;
  for (let i = 0; i < groupId.length; i++) hash = (hash * 31 + groupId.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

/** "HH:mm" → minutes since midnight. */
function toMin(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Minutes → "HH:mm" (on the hour) for the gutter labels. */
function toLabel(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:00`;
}

/**
 * Minimum height for a session block so its content stays readable: the group
 * name + time lines always fit, plus a room/conflict line when present. Capped
 * so a short session never balloons across the whole grid.
 */
function minBlockHeight(lines: number): number {
  return Math.min(Math.max(MIN_BLOCK_H, lines * LINE_H + BLOCK_PAD), MAX_BLOCK_H);
}

/** Visible time window derived from the sessions, rounded to full hours. */
function rangeFor(byDay: SessionWithGroup[][]): [number, number] {
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

/** Dates of the current week, anchored on the configured first day. */
function weekDates(now: Date, weekStartsOn: number): Date[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - ((now.getDay() - weekStartsOn + 7) % 7));
  return DAYS.map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

interface PlacedSession {
  session: SessionWithGroup;
  col: number;
  cols: number;
}

/**
 * Greedy column assignment + a second pass that counts, per session, how many
 * columns hold an overlapping session — so overlaps render side-by-side with
 * proportional widths, while non-overlapping sessions stay full-width.
 */
function layoutDay(sessions: SessionWithGroup[]): PlacedSession[] {
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

interface WeekGridProps {
  /** Sessions bucketed by day index (0=Sunday … 6=Saturday). */
  byDay: SessionWithGroup[][];
  conflicts: Set<string>;
  deletingId: string | null;
  onEdit: (s: GroupSession) => void;
  onDelete: (s: GroupSession) => void;
  onAttend: (s: SessionWithGroup) => void;
}

const gridTemplate = { gridTemplateColumns: `${GUTTER_W} repeat(7, minmax(0, 1fr))` } as const;

export default function WeekGrid({
  byDay,
  conflicts,
  deletingId,
  onEdit,
  onDelete,
  onAttend,
}: WeekGridProps) {
  const { t } = useTranslation();
  const hour24 = useTimeStore((s) => s.hour24);
  const weekStartsOn = useWeekStore((s) => s.weekStartsOn);
  const daysOrder = orderedDayIndices(weekStartsOn);

  const [rangeStart, rangeEnd] = useMemo(() => rangeFor(byDay), [byDay]);
  const totalH = ((rangeEnd - rangeStart) / 60) * HOUR_PX;

  const now = new Date();
  const today = now.getDay();
  const dates = weekDates(now, weekStartsOn);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowVisible = nowMin >= rangeStart && nowMin <= rangeEnd;

  const hours: number[] = [];
  for (let h = rangeStart; h < rangeEnd; h += 60) hours.push(h);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[880px] overflow-hidden rounded-xl border bg-card">
        {/* Day headers */}
        <div className="grid" style={gridTemplate}>
          <div className="border-b border-border/60" />
          {daysOrder.map((day, i) => (
            <div
              key={day}
              className={cn(
                "border-b border-inline-start border-border/60 px-2 py-2 text-center",
                day === today && "bg-muted/60",
              )}
            >
              <p className={cn("text-xs font-semibold", day === today && "text-foreground")}>
                {t(`schedule.days.${DAYS[day]}`)}
              </p>
              <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                {dates[i].getDate()}
              </p>
            </div>
          ))}
        </div>

        {/* Time gutter + day columns */}
        <div className="grid" style={gridTemplate}>
          <div className="relative border-b border-border/60" style={{ height: totalH }}>
            {hours.map((h) => (
              <span
                key={h}
                className="absolute end-1 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground"
                style={{ top: ((h - rangeStart) / 60) * HOUR_PX }}
              >
                {formatTime(toLabel(h), hour24)}
              </span>
            ))}
          </div>

          {daysOrder.map((day) => (
            <div
              key={day}
              className={cn(
                "relative border-inline-start border-border/60",
                day === today && "bg-muted/30",
              )}
              style={{ height: totalH }}
            >
              {hours.map((h) =>
                h > rangeStart ? (
                  <div
                    key={h}
                    className="absolute inset-x-0 border-t border-border/40"
                    style={{ top: ((h - rangeStart) / 60) * HOUR_PX }}
                  />
                ) : null,
              )}

              {day === today && nowVisible && (
                <div
                  className="absolute inset-x-0 z-10 border-t-2 border-destructive/70"
                  style={{ top: ((nowMin - rangeStart) / 60) * HOUR_PX }}
                />
              )}

              {layoutDay(byDay[day]).map((placed) => (
                <SessionBlock
                  key={placed.session.id}
                  placed={placed}
                  rangeStart={rangeStart}
                  conflicted={conflicts.has(placed.session.id)}
                  deleting={deletingId === placed.session.id}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onAttend={onAttend}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SessionBlock({
  placed,
  rangeStart,
  conflicted,
  deleting,
  onEdit,
  onDelete,
  onAttend,
}: {
  placed: PlacedSession;
  rangeStart: number;
  conflicted: boolean;
  deleting: boolean;
  onEdit: (s: GroupSession) => void;
  onDelete: (s: GroupSession) => void;
  onAttend: (s: SessionWithGroup) => void;
}) {
  const { t } = useTranslation();
  const hour24 = useTimeStore((s) => s.hour24);
  const { session, col, cols } = placed;
  const pal = paletteFor(session.groupId);

  const start = toMin(session.startTime);
  const end = toMin(session.endTime);
  const top = ((start - rangeStart) / 60) * HOUR_PX + 2;
  const lines = 2 + (session.room ? 1 : 0) + (conflicted ? 1 : 0);
  const height = Math.max(
    ((end - start) / 60) * HOUR_PX - 4,
    deleting ? CHIP_H : minBlockHeight(lines),
  );

  return (
    <div
      className={cn(
        "group absolute overflow-hidden rounded-md border p-1.5 transition-shadow hover:shadow-md",
        pal.bg,
        pal.border,
        conflicted && "ring-1 ring-destructive/60",
        deleting && "ring-2 ring-destructive",
      )}
      style={{
        top,
        height,
        insetInlineStart: `calc(${(col / cols) * 100}% + 1px)`,
        width: `calc(${(1 / cols) * 100}% - 2px)`,
      }}
    >
      <div className={cn("absolute inset-y-1 start-0 w-1 rounded-full", pal.bar)} />

      <div className="min-w-0 ps-2 pe-1">
        <p className="truncate text-xs font-semibold leading-tight">{session.groupName}</p>
        <p className="mt-0.5 text-[11px] leading-tight tabular-nums text-muted-foreground">
          {formatTime(session.startTime, hour24)} – {formatTime(session.endTime, hour24)}
        </p>
        {session.room && (
          <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
            {t("schedule.room")}: {session.room}
          </p>
        )}
        {conflicted && (
          <p className="mt-0.5 flex items-center gap-0.5 text-[11px] font-medium leading-tight text-destructive">
            <AlertTriangle className="size-3" />
            {t("schedule.conflict")}
          </p>
        )}
      </div>

      {deleting ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-card/90">
          <Button
            variant="destructive"
            size="sm"
            className="h-6 gap-1 px-1.5 text-[11px]"
            aria-label={t("schedule.confirmDelete")}
            title={t("schedule.confirmDelete")}
            onClick={() => onDelete(session)}
          >
            <Trash2 className="size-3" />
            <span className="max-w-28 truncate">{t("schedule.confirmDelete")}</span>
          </Button>
        </div>
      ) : (
        <div className="absolute end-1 top-1 z-10 flex flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <Button
            variant="ghost"
            size="icon-xs"
            className="bg-card/80 hover:bg-card"
            aria-label={t("schedule.attend")}
            title={t("schedule.attend")}
            onClick={() => onAttend(session)}
          >
            <CalendarCheck />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="bg-card/80 hover:bg-card"
            aria-label={t("schedule.edit")}
            title={t("schedule.edit")}
            onClick={() => onEdit(session)}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="bg-card/80 hover:bg-card"
            aria-label={t("schedule.delete")}
            title={t("schedule.delete")}
            onClick={() => onDelete(session)}
          >
            <Trash2 />
          </Button>
        </div>
      )}
    </div>
  );
}
