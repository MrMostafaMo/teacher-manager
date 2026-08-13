import { useMemo, useState } from "react";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import type { GroupSession, SessionException } from "@/lib/db/schema";
import { formatDate, formatTime } from "@/lib/utils/format";
import { useTimeStore } from "@/lib/time-store";
import { orderedDayIndices, useWeekStore } from "@/lib/week-store";
import { applyExceptions, conflictIds } from "@/features/schedule/application/schedule-exceptions";
import {
  HOUR_PX,
  gridTemplate,
  isoDate,
  layoutDay,
  rangeFor,
  toLabel,
  weekDates,
} from "./week-layout";
import { DayColumn } from "./day-column";
import { WeekHeader } from "./week-header";
import { WeekNav } from "./week-nav";

interface WeekGridProps {
  /** Sessions bucketed by day index (0=Sunday … 6=Saturday). */
  byDay: SessionWithGroup[][];
  /** Per-occurrence cancellations/moves for the visible week. */
  exceptions: SessionException[];
  deletingId: string | null;
  onEdit: (s: GroupSession) => void;
  onDelete: (s: GroupSession) => void;
  onAttend: (s: SessionWithGroup) => void;
  onOccurrence: (s: SessionWithGroup, date: string) => void;
}

export default function WeekGrid({
  byDay,
  exceptions,
  deletingId,
  onEdit,
  onDelete,
  onAttend,
  onOccurrence,
}: WeekGridProps) {
  const hour24 = useTimeStore((s) => s.hour24);
  const weekStartsOn = useWeekStore((s) => s.weekStartsOn);
  const daysOrder = orderedDayIndices(weekStartsOn);

  const [weekOffset, setWeekOffset] = useState(0);
  const isCurrentWeek = weekOffset === 0;

  const now = new Date();
  const today = now.getDay();
  const dates = weekDates(now, weekStartsOn, weekOffset);

  const effectiveByDay = useMemo(
    () => applyExceptions(byDay, exceptions, dates),
    [byDay, exceptions, dates],
  );
  const conflicts = useMemo(() => conflictIds(effectiveByDay), [effectiveByDay]);

  const [rangeStart, rangeEnd] = useMemo(() => rangeFor(effectiveByDay), [effectiveByDay]);
  const totalH = ((rangeEnd - rangeStart) / 60) * HOUR_PX;

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowVisible = isCurrentWeek && nowMin >= rangeStart && nowMin <= rangeEnd;

  const hours: number[] = [];
  for (let h = rangeStart; h < rangeEnd; h += 60) hours.push(h);

  return (
    <div className="space-y-3">
      <WeekNav
        rangeLabel={`${formatDate(dates[0], "DD-MM-YYYY")} – ${formatDate(
          dates[dates.length - 1],
          "DD-MM-YYYY",
        )}`}
        isCurrentWeek={isCurrentWeek}
        onPrev={() => setWeekOffset((o) => o - 1)}
        onNext={() => setWeekOffset((o) => o + 1)}
        onToday={() => setWeekOffset(0)}
      />

      <div className="overflow-x-auto">
        <div className="min-w-[880px] overflow-hidden rounded-xl border bg-card">
          <WeekHeader daysOrder={daysOrder} dates={dates} today={today} isCurrentWeek={isCurrentWeek} />

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

            {daysOrder.map((day, i) => (
              <DayColumn
                key={day}
                day={day}
                date={isoDate(dates[i])}
                today={today}
                isCurrentWeek={isCurrentWeek}
                nowVisible={nowVisible}
                nowTop={((nowMin - rangeStart) / 60) * HOUR_PX}
                hours={hours}
                rangeStart={rangeStart}
                totalH={totalH}
                placed={layoutDay(effectiveByDay[day])}
                conflicts={conflicts}
                deletingId={deletingId}
                onEdit={onEdit}
                onDelete={onDelete}
                onAttend={onAttend}
                onOccurrence={onOccurrence}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
