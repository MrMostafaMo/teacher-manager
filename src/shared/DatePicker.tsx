import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs, { type Dayjs } from "dayjs";
import localeData from "dayjs/plugin/localeData";
import { Calendar, CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateString } from "@/lib/utils/format";
import { useWeekStore } from "@/lib/week-store";

dayjs.extend(localeData);

type BaseProps = {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
};

const triggerClass =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring dark:bg-muted/50";

const MARGIN = 8;
const POPOVER_WIDTHS: Record<string, number> = { "w-56": 224, "w-64": 256, "w-72": 288 };

export function PopoverShell({
  open,
  onClose,
  trigger,
  children,
  width = "w-72",
}: {
  open: boolean;
  onClose: () => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
  width?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; maxHeight: number } | null>(null);

  const update = useCallback(() => {
    const wrapper = ref.current;
    if (!wrapper) return;
    const r = wrapper.getBoundingClientRect();
    const popW = POPOVER_WIDTHS[width] ?? 288;
    const below = window.innerHeight - r.bottom - MARGIN;
    const above = r.top - MARGIN;
    const maxHeight = Math.max(below, above);
    const isRtl = (document.documentElement.dir ?? "ltr") === "rtl";
    const start = isRtl ? r.right - popW : r.left;
    const left = Math.min(Math.max(start, MARGIN), window.innerWidth - popW - MARGIN);
    if (below >= above) setPos({ top: r.bottom + MARGIN, left, maxHeight });
    else setPos({ bottom: window.innerHeight - r.top + MARGIN, left, maxHeight });
  }, [width]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, update]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onClose]);

  return (
    <div ref={ref} className="relative inline-flex">
      {trigger}
      {open && pos && (
        <div
          style={{
            top: pos.top,
            bottom: pos.bottom,
            left: pos.left,
            maxHeight: pos.maxHeight,
          }}
          className={cn(
            "fixed z-50 animate-in fade-in-0 zoom-in-95 overflow-y-auto rounded-lg border bg-popover p-2 text-popover-foreground shadow-md",
            width,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

const navBtn =
  "flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground";

export function DatePicker({ value, onChange, ariaLabel, className }: BaseProps) {
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
          aria-label={ariaLabel}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={cn(triggerClass, className)}
        >
          <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
          <span className={cn(value ? "" : "text-muted-foreground")}>
            {value ? formatDateString(value) : t("common.selectDate")}
          </span>
        </button>
      }
    >
      <div className="flex items-center justify-between pb-1">
        <button type="button" aria-label={t("common.previous")} className={navBtn} onClick={() => setView((v) => v.subtract(1, "month"))}>
          <ChevronRight className="size-4 rtl:rotate-180" />
        </button>
        <div className="text-sm font-medium">
          {months[view.month()]} {view.year()}
        </div>
        <button type="button" aria-label={t("common.next")} className={navBtn} onClick={() => setView((v) => v.add(1, "month"))}>
          <ChevronLeft className="size-4 rtl:rotate-180" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {weekdays.map((w: string) => (
          <div key={w} className="flex size-8 items-center justify-center text-xs text-muted-foreground">
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
              onClick={() => pick(iso)}
              className={cn(
                "flex size-8 items-center justify-center rounded-md text-sm hover:bg-accent",
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
          className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          onClick={() => pick(today.format("YYYY-MM-DD"))}
        >
          {t("common.today")}
        </button>
        {value && (
          <button
            type="button"
            className="ms-auto rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={() => pick("")}
          >
            {t("common.clear")}
          </button>
        )}
      </div>
    </PopoverShell>
  );
}

export function MonthPicker({ value, onChange, ariaLabel, className }: BaseProps) {
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
                "rounded-md px-2 py-1.5 text-xs hover:bg-accent",
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
          className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          onClick={() => pick(now.format("YYYY-MM"))}
        >
          {t("common.today")}
        </button>
        {value && (
          <button
            type="button"
            className="ms-auto rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={() => pick("")}
          >
            {t("common.clear")}
          </button>
        )}
      </div>
    </PopoverShell>
  );
}
