import { useTranslation } from "react-i18next";
import type { AttendanceStatus } from "@/features/attendance/domain";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/utils/format";

export function SummaryCards({
  total,
  totalLabel,
  counts,
  unmarked,
  rate,
}: {
  total: number;
  totalLabel: string;
  counts: Record<AttendanceStatus, number>;
  /** Daily sheet: students left without a chosen status (skips the card when omitted). */
  unmarked?: number;
  /** Attendance rate (0–1); null renders "—". */
  rate: number | null;
}) {
  const { t } = useTranslation();

  const cards: Array<{ key: string; value: string; className?: string }> = [
    { key: totalLabel, value: String(total) },
    {
      key: "attendance.summary.present",
      value: String(counts.present),
      className: "text-success",
    },
    {
      key: "attendance.summary.absent",
      value: String(counts.absent),
      className: "text-destructive",
    },
    {
      key: "attendance.summary.late",
      value: String(counts.late),
      className: "text-warning",
    },
    {
      key: "attendance.summary.excused",
      value: String(counts.excused),
      className: "text-(--chart-5)",
    },
  ];
  if (unmarked !== undefined) {
    cards.push({
      key: "attendance.summary.unmarked",
      value: String(unmarked),
      className: "text-muted-foreground",
    });
  }
  cards.push({
    key: "attendance.summary.percentage",
    value: rate !== null ? formatPercent(rate) : "—",
  });

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2",
        unmarked !== undefined ? "sm:grid-cols-7" : "sm:grid-cols-6",
      )}
    >
      {cards.map((c) => (
        <div
          key={c.key}
          className="flex flex-col gap-1 rounded-lg border bg-card p-3 text-sm"
        >
          <p className="text-xs text-muted-foreground">{t(c.key)}</p>
          <p className={cn("text-lg font-semibold", c.className)}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}
