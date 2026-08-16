import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils/format";
import { useTimeStore } from "@/lib/time-store";
import { PopoverShell } from "@/shared/popover-shell";
import { Select } from "@/components/ui/select";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
}

const triggerClass =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring dark:bg-muted";

export function TimePicker({ value, onChange, ariaLabel, className }: TimePickerProps) {
  const { t } = useTranslation();
  const hour24 = useTimeStore((s) => s.hour24);
  const [open, setOpen] = useState(false);

  const hour = value ? Number(value.slice(0, 2)) : null;
  const minute = value ? Number(value.slice(3, 5)) : null;

  function pickTime(h: number, m: number) {
    onChange(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    setOpen(false);
  }

  return (
    <PopoverShell
      open={open}
      onClose={() => setOpen(false)}
      width="w-56"
      trigger={
        <button
          type="button"
          aria-label={ariaLabel}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={cn(triggerClass, className)}
        >
          <Clock className="size-3.5 shrink-0 text-muted-foreground" />
          <span className={cn(value ? "" : "text-muted-foreground")}>
            {value ? formatTime(value, hour24) : t("common.selectTime")}
          </span>
        </button>
      }
    >
      <div className="flex items-center justify-center gap-2 py-1">
        <label className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted-foreground">{t("common.hour")}</span>
          <Select
            value={hour ?? ""}
            onChange={(e) => pickTime(Number(e.target.value), minute ?? 0)}
            aria-label={t("common.hour")}
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}
              </option>
            ))}
          </Select>
        </label>
        <span className="pb-5 text-muted-foreground">:</span>
        <label className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted-foreground">{t("common.minute")}</span>
          <Select
            value={minute ?? 0}
            onChange={(e) => pickTime(hour ?? 0, Number(e.target.value))}
            aria-label={t("common.minute")}
          >
            {MINUTES.map((m) => (
              <option key={m} value={m}>
                {String(m).padStart(2, "0")}
              </option>
            ))}
          </Select>
        </label>
      </div>
      {value && (
        <div className="mt-1.5 flex items-center border-t pt-1.5">
          <button
            type="button"
            className="ms-auto rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={() => onChange("")}
          >
            {t("common.clear")}
          </button>
        </div>
      )}
    </PopoverShell>
  );
}
