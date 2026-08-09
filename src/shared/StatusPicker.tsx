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
export function StatusPicker({
  value,
  onChange,
}: {
  /** Undefined = no status chosen yet (e.g. a future day). */
  value?: AttendanceStatus;
  onChange: (s: AttendanceStatus) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-1">
      {ATTENDANCE_STATUSES.map((status) => (
        <button
          key={status}
          type="button"
          aria-pressed={value === status}
          onClick={() => onChange(status)}
          className={cn(
            "rounded-md border px-2.5 py-1 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring",
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
}
