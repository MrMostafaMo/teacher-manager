import { useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs, { type Dayjs } from "dayjs";
import localeData from "dayjs/plugin/localeData";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateString } from "@/lib/utils/format";
import { useWeekStore } from "@/lib/week-store";
import { PopoverShell } from "./popover-shell";
import { navBtn, triggerClass, type PickerProps } from "./picker-shared";

dayjs.extend(localeData);

export function DatePicker({
  value,
  onChange,
  ariaLabel,
  className,
  id,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: PickerProps) {
  const { t } = useTranslation();
  const weekStartsOn = useWeekStore((s) => s.weekStartsOn);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => dayjs().startOf("month"));
  const localeData = dayjs.localeData();
  const months = localeData.months();
  const baseWeekdays = localeData.weekdaysShort();
  const weekdays = [...baseWeekdays.slice(weekStartsOn), ...baseWeekdays.slice(0, weekStartsOn)];
  const today = dayjs().startOf("day");

  const firstOfMonth = view.startOf("month");
  const gridStart = firstOfMonth.subtract((firstOfMonth.day() - weekStartsOn + 7) % 7, "day");
  const days: Dayjs[] = [];
  for (let i = 0; i < 42; i++) days.push(gridStart.add(i, "day"));

  const pick = (iso: string) => {
    onChange(iso);
    setOpen(false);
  };

  return (
    <PopoverShell
      open={open}
      onClose={() => setOpen(false)}
      width="w-72"
      trigger={
        <button
          type="button"
          id={id}
          aria-label={ariaLabel}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          onClick={() => setOpen((v) => !v)}
          className={cn(triggerClass, className, ariaInvalid && "border-destructive focus-visible:border-destructive")}
        >
          <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
          <span className={cn(value ? "" : "text-muted-foreground")}>
            {value ? formatDateString(value) : t("common.selectDate")}
          </span>
        </button>
      }
    >
      <div className="flex items-center justify-between pb-1">
        <button
          type="button"
          aria-label={t("common.previous")}
          className={navBtn}
          onClick={() => setView((v) => v.subtract(1, "month"))}
        >
          <ChevronRight className="size-4 rtl:rotate-180" />
        </button>
        <div className="text-sm font-medium">
          {months[view.month()]} {view.year()}
        </div>
        <button
          type="button"
          aria-label={t("common.next")}
          className={navBtn}
          onClick={() => setView((v) => v.add(1, "month"))}
        >
          <ChevronLeft className="size-4 rtl:rotate-180" />
        </button>
      </div>
      <div role="grid" aria-label={t("common.selectDate")} className="grid grid-cols-7 gap-0.5">
        {weekdays.map((w: string) => (
          <div
            key={w}
            role="columnheader"
            className="flex size-8 items-center justify-center text-xs text-muted-foreground"
          >
            {w}
          </div>
        ))}
        {days.map((d) => {
          const iso = d.format("YYYY-MM-DD");
          const inMonth = d.month() === view.month();
          const isToday = d.isSame(today, "day");
          const isSelected = value === iso;
          return (
            <button
              key={iso}
              type="button"
              role="gridcell"
              aria-selected={isSelected}
              aria-current={isToday ? "date" : undefined}
              onClick={() => pick(iso)}
              className={cn(
                "flex size-8 items-center justify-center rounded-lg text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                !inMonth && "text-muted-foreground/40 hover:text-muted-foreground",
                isToday && !isSelected && "font-semibold text-primary",
                isSelected && "bg-primary font-medium text-primary-foreground hover:bg-primary",
              )}
            >
              {d.date()}
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex items-center gap-1 border-t pt-1.5">
        <button
          type="button"
          className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          onClick={() => pick(today.format("YYYY-MM-DD"))}
        >
          {t("common.today")}
        </button>
        {value && (
          <button
            type="button"
            className="ms-auto rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={() => pick("")}
          >
            {t("common.clear")}
          </button>
        )}
      </div>
    </PopoverShell>
  );
}
