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
  present: "border-emerald-600 bg-emerald-600/15 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  absent: "border-destructive bg-destructive/10 text-destructive",
  late: "border-amber-600 bg-amber-600/15 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  excused: "border-violet-600 bg-violet-600/15 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
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
            "rounded-md border px-2.5 py-1 text-xs transition-colors",
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
