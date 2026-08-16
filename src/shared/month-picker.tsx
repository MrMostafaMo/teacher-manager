import { useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PopoverShell } from "./popover-shell";
import { navBtn, triggerClass, type PickerProps } from "./picker-shared";

dayjs.extend(localeData);

export function MonthPicker({ value, onChange, ariaLabel, className }: PickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => dayjs().year());
  const months = dayjs.localeData().months();
  const now = dayjs();
  const selected = value ? Number(value.slice(0, 4)) : null;

  const pick = (iso: string) => {
    onChange(iso);
    setOpen(false);
  };

  return (
    <PopoverShell
      open={open}
      onClose={() => setOpen(false)}
      width="w-64"
      trigger={
        <button
          type="button"
          aria-label={ariaLabel}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={cn(triggerClass, className)}
        >
          <CalendarRange className="size-3.5 shrink-0 text-muted-foreground" />
          <span className={cn(value ? "" : "text-muted-foreground")}>
            {value ? `${months[Number(value.slice(5, 7)) - 1]} ${selected}` : t("common.selectMonth")}
          </span>
        </button>
      }
    >
      <div className="flex items-center justify-between pb-1">
        <button type="button" aria-label={t("common.previous")} className={navBtn} onClick={() => setYear((y) => y - 1)}>
          <ChevronRight className="size-4 rtl:rotate-180" />
        </button>
        <div className="text-sm font-medium">{year}</div>
        <button type="button" aria-label={t("common.next")} className={navBtn} onClick={() => setYear((y) => y + 1)}>
          <ChevronLeft className="size-4 rtl:rotate-180" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {months.map((m: string, i: number) => {
          const iso = dayjs().year(year).month(i).format("YYYY-MM");
          const isNow = year === now.year() && i === now.month();
          const isSelected = value === iso;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => pick(iso)}
              className={cn(
                "rounded-lg px-2 py-1.5 text-xs hover:bg-accent",
                isNow && !isSelected && "font-semibold text-primary",
                isSelected && "bg-primary font-medium text-primary-foreground hover:bg-primary",
              )}
            >
              {m}
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex items-center border-t pt-1.5">
        <button
          type="button"
          className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          onClick={() => pick(now.format("YYYY-MM"))}
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
