import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import type { GroupSession } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { formatDate, formatTime } from "@/lib/utils/format";
import { useTimeStore } from "@/lib/time-store";
import { orderedDayIndices, useWeekStore } from "@/lib/week-store";
import { DAYS } from "@/features/schedule/domain";
import {
  HOUR_PX,
  gridTemplate,
  layoutDay,
  rangeFor,
  toLabel,
  weekDates,
} from "./week-layout";
import { DayColumn } from "./day-column";
import { WeekNav } from "./week-nav";

interface WeekGridProps {
  /** Sessions bucketed by day index (0=Sunday … 6=Saturday). */
  byDay: SessionWithGroup[][];
  conflicts: Set<string>;
  deletingId: string | null;
  onEdit: (s: GroupSession) => void;
  onDelete: (s: GroupSession) => void;
  onAttend: (s: SessionWithGroup) => void;
}

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

  const [weekOffset, setWeekOffset] = useState(0);
  const isCurrentWeek = weekOffset === 0;

  const [rangeStart, rangeEnd] = useMemo(() => rangeFor(byDay), [byDay]);
  const totalH = ((rangeEnd - rangeStart) / 60) * HOUR_PX;

  const now = new Date();
  const today = now.getDay();
  const dates = weekDates(now, weekStartsOn, weekOffset);
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
          {/* Day headers */}
          <div className="grid" style={gridTemplate}>
            <div className="border-b border-border/60" />
            {daysOrder.map((day, i) => (
              <div
                key={day}
                className={cn(
                  "border-b border-inline-start border-border/60 px-2 py-2 text-center",
                  isCurrentWeek && day === today && "bg-muted/60",
                )}
              >
                <p
                  className={cn(
                    "text-xs font-semibold",
                    isCurrentWeek && day === today && "text-foreground",
                  )}
                >
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
              <DayColumn
                key={day}
                day={day}
                today={today}
                isCurrentWeek={isCurrentWeek}
                nowVisible={nowVisible}
                nowTop={((nowMin - rangeStart) / 60) * HOUR_PX}
                hours={hours}
                rangeStart={rangeStart}
                totalH={totalH}
                placed={layoutDay(byDay[day])}
                conflicts={conflicts}
                deletingId={deletingId}
                onEdit={onEdit}
                onDelete={onDelete}
                onAttend={onAttend}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
