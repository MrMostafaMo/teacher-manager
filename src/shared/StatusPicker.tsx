import { memo } from "react";
import { useTranslation } from "react-i18next";
import { ATTENDANCE_STATUSES, type AttendanceStatus } from "@/features/attendance/domain";
import { cn } from "@/lib/utils";

const STATUS_LABEL_KEY: Record<AttendanceStatus, string> = {
  present: "attendance.statusPresent",
  absent: "attendance.statusAbsent",
  late: "attendance.statusLate",
  excused: "attendance.statusExcused",
};

const STATUS_BADGE: Record<AttendanceStatus, string> = {
  present: "border-success bg-success/15 text-success",
  absent: "border-destructive bg-destructive/10 text-destructive",
  late: "border-warning bg-warning/15 text-warning",
  excused: "border-(--chart-5) bg-(--chart-5)/15 text-(--chart-5)",
};

/** Present / absent / late / excused segmented control. Shared by daily & session sheets. */
export const StatusPicker = memo(function StatusPicker({
  value,
  onChange,
}: {
  /** Undefined = no status chosen yet (e.g. a future day). */
  value?: AttendanceStatus;
  onChange: (s: AttendanceStatus) => void;
}) {
  const { t } = useTranslation();
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const buttons = Array.from(
      (e.currentTarget as HTMLDivElement).querySelectorAll<HTMLButtonElement>("button"),
    );
    const idx = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (idx === -1) return;
    const next = e.key === "ArrowRight" ? (idx + 1) % buttons.length : (idx - 1 + buttons.length) % buttons.length;
    buttons[next].focus();
  }
  return (
    <div role="group" aria-label={t("attendance.columns.status")} className="flex gap-1" onKeyDown={onKeyDown}>
      {ATTENDANCE_STATUSES.map((status) => (
        <button
          key={status}
          type="button"
          aria-pressed={value === status}
          onClick={() => onChange(status)}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring",
            value === status
              ? STATUS_BADGE[status]
              : "border-input text-muted-foreground hover:bg-muted/50",
          )}
        >
          {t(STATUS_LABEL_KEY[status])}
        </button>
      ))}
    </div>
  );
});
