import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney, formatNumber } from "@/lib/utils/format";
import type {
  AttendanceTrendPoint,
  ExamTrendPoint,
  HomeworkTrendPoint,
  PaymentTrendPoint,
} from "@/features/student-profile/application/student-trends";

const ATTENDANCE_COLORS = {
  present: "var(--chart-2)",
  late: "var(--chart-3)",
  absent: "var(--chart-4)",
  excused: "var(--chart-5)",
};

function TrendTooltip({ active, payload, label, format }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-(--popover-shadow)">
      <p className="mb-1 font-medium">{label}</p>
      <div className="space-y-1">
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: p.color ?? p.payload?.fill }}
            />
            <span className="text-muted-foreground">{p.name}</span>
            <span className="ms-auto font-semibold tabular-nums" dir="ltr">
              {format ? format(p.value) : formatNumber(p.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const formatPct = (v: number) => `${formatNumber(v)}%`;
const attendanceTooltipContent = <TrendTooltip />;
const pctTooltipContent = <TrendTooltip format={formatPct} />;
const moneyTooltipContent = <TrendTooltip format={formatMoney} />;

/** Monthly attendance bars. Re-renders only when `data` changes. */
export const AttendanceBars = memo(function AttendanceBars({
  data,
}: {
  data: AttendanceTrendPoint[];
}) {
  const { t } = useTranslation();
  return (
    <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
      <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
      <Tooltip content={attendanceTooltipContent} />
      <Bar
        dataKey="present"
        stackId="a"
        fill={ATTENDANCE_COLORS.present}
        name={t("attendance.statusPresent")}
      />
      <Bar
        dataKey="late"
        stackId="a"
        fill={ATTENDANCE_COLORS.late}
        name={t("attendance.statusLate")}
      />
      <Bar
        dataKey="absent"
        stackId="a"
        fill={ATTENDANCE_COLORS.absent}
        name={t("attendance.statusAbsent")}
      />
      <Bar
        dataKey="excused"
        stackId="a"
        fill={ATTENDANCE_COLORS.excused}
        name={t("attendance.statusExcused")}
        radius={[3, 3, 0, 0]}
      />
    </BarChart>
  );
});

/** Exam score line. Re-renders only when `data` changes. */
export const ExamLine = memo(function ExamLine({ data }: { data: ExamTrendPoint[] }) {
  const { t } = useTranslation();
  return (
    <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
      <YAxis
        tickLine={false}
        axisLine={false}
        fontSize={12}
        domain={[0, 100]}
        allowDecimals={false}
      />
      <Tooltip content={pctTooltipContent} />
      <Line
        type="monotone"
        dataKey="pct"
        stroke="var(--chart-1)"
        strokeWidth={2}
        dot={{ r: 3 }}
        name={t("profile.trends.examScore")}
      />
    </LineChart>
  );
});

/** Homework completion bars. Re-renders only when `data` changes. */
export const HomeworkBars = memo(function HomeworkBars({ data }: { data: HomeworkTrendPoint[] }) {
  const { t } = useTranslation();
  return (
    <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
      <YAxis
        tickLine={false}
        axisLine={false}
        fontSize={12}
        domain={[0, 100]}
        allowDecimals={false}
      />
      <Tooltip content={pctTooltipContent} />
      <Bar
        dataKey="rate"
        fill="var(--chart-5)"
        radius={[3, 3, 0, 0]}
        name={t("profile.trends.homeworkDone")}
      />
    </BarChart>
  );
});

/** Payment bars. Re-renders only when `data` changes. */
export const PaymentBars = memo(function PaymentBars({ data }: { data: PaymentTrendPoint[] }) {
  const { t } = useTranslation();
  return (
    <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
      <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
      <Tooltip content={moneyTooltipContent} />
      <Bar
        dataKey="amount"
        fill="var(--chart-2)"
        radius={[3, 3, 0, 0]}
        name={t("profile.trends.paymentsAmount")}
      />
    </BarChart>
  );
});
