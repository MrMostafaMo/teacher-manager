import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { DAYS } from "@/features/schedule/domain";
import { gridTemplate } from "./week-layout";

interface WeekHeaderProps {
  daysOrder: number[];
  dates: Date[];
  today: number;
  isCurrentWeek: boolean;
}

/** Day-of-week header row above the grid columns. */
export function WeekHeader({ daysOrder, dates, today, isCurrentWeek }: WeekHeaderProps) {
  const { t } = useTranslation();
  return (
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
          <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">{dates[i].getDate()}</p>
        </div>
      ))}
    </div>
  );
}
