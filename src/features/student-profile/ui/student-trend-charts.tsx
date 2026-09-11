import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney, formatNumber } from "@/lib/utils/format";
import { RechartsTooltip } from "@/shared/chart-legend";
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

const formatPct = (v: number) => `${formatNumber(v)}%`;
const attendanceTooltipContent = <RechartsTooltip />;
const pctTooltipContent = <RechartsTooltip format={formatPct} />;
const moneyTooltipContent = <RechartsTooltip format={formatMoney} />;

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
      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "var(--muted-foreground)" }} />
      <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} tick={{ fill: "var(--muted-foreground)" }} />
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
      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "var(--muted-foreground)" }} />
      <YAxis
        tickLine={false}
        axisLine={false}
        fontSize={12}
        domain={[0, 100]}
        allowDecimals={false}
        tick={{ fill: "var(--muted-foreground)" }}
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
      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "var(--muted-foreground)" }} />
      <YAxis
        tickLine={false}
        axisLine={false}
        fontSize={12}
        domain={[0, 100]}
        allowDecimals={false}
        tick={{ fill: "var(--muted-foreground)" }}
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
      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "var(--muted-foreground)" }} />
      <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} tick={{ fill: "var(--muted-foreground)" }} />
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
