import { memo, useId } from "react";
import { useTranslation } from "react-i18next";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ATTENDANCE_COLORS,
  type AttendancePoint,
  type FinancePoint,
  type HomeworkSlice,
} from "./dashboard-chart-data";
import { chartTooltipContent } from "./dashboard-chart-kit";

export { LazyChart } from "./dashboard-chart-kit";

/** Stacked monthly attendance bars. Re-renders only when `data` changes. */
export const AttendanceTrendChart = memo(function AttendanceTrendChart({
  data,
}: {
  data: AttendancePoint[];
}) {
  const { t } = useTranslation();
  const prefersReduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }} role="img" aria-label={t("dashboard.charts.attendance")}>
      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
      <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "hsl(var(--muted-foreground))" }} />
      <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
      <Tooltip content={chartTooltipContent} />
      <Bar
        dataKey="present"
        stackId="a"
        fill={ATTENDANCE_COLORS.present}
        name={t("attendance.statusPresent")}
        isAnimationActive={!prefersReduced}
      />
      <Bar
        dataKey="late"
        stackId="a"
        fill={ATTENDANCE_COLORS.late}
        name={t("attendance.statusLate")}
        isAnimationActive={!prefersReduced}
      />
      <Bar
        dataKey="absent"
        stackId="a"
        fill={ATTENDANCE_COLORS.absent}
        name={t("attendance.statusAbsent")}
        isAnimationActive={!prefersReduced}
      />
      <Bar
        dataKey="excused"
        stackId="a"
        fill={ATTENDANCE_COLORS.excused}
        name={t("attendance.statusExcused")}
        radius={[3, 3, 0, 0]}
        isAnimationActive={!prefersReduced}
      />
    </BarChart>
  );
});

/** Homework status donut. Re-renders only when `data` changes. */
export const HomeworkPieChart = memo(function HomeworkPieChart({
  data,
}: {
  data: HomeworkSlice[];
}) {
  const total = data.reduce((sum, s) => sum + s.value, 0);
  const prefersReduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <PieChart>
      <Pie
        data={data}
        dataKey="value"
        nameKey="label"
        innerRadius={45}
        outerRadius={70}
        paddingAngle={2}
        isAnimationActive={!prefersReduced}
      >
        {data.map((s) => (
          <Cell key={s.key} fill={s.fill} />
        ))}
      </Pie>
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="fill-foreground text-lg font-bold">
        {total}
      </text>
      <Tooltip content={chartTooltipContent} />
    </PieChart>
  );
});

/** Monthly collected/expenses area or net area. Re-renders only when `data` changes. */
export const FinanceAreaChart = memo(function FinanceAreaChart({
  data,
  kind,
}: {
  data: FinancePoint[];
  kind: "both" | "net";
}) {
  const { t } = useTranslation();
  const uid = useId();
  const prefersReduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const gradNet = `gradNet-${uid}`;
  const gradCollected = `gradCollected-${uid}`;
  const gradExpenses = `gradExpenses-${uid}`;
  if (kind === "net") {
    return (
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id={gradNet} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={ATTENDANCE_COLORS.excused} stopOpacity={0.25} />
            <stop offset="95%" stopColor={ATTENDANCE_COLORS.excused} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "hsl(var(--muted-foreground))" }} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "hsl(var(--muted-foreground))" }} />
        <Tooltip content={chartTooltipContent} />
        <Area
          type="monotone"
          dataKey="net"
          stroke={ATTENDANCE_COLORS.excused}
          strokeWidth={2}
          fill={`url(#${gradNet})`}
          name={t("dashboard.charts.net")}
          isAnimationActive={!prefersReduced}
        />
      </AreaChart>
    );
  }
  return (
    <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
      <defs>
        <linearGradient id={gradCollected} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={ATTENDANCE_COLORS.present} stopOpacity={0.25} />
          <stop offset="95%" stopColor={ATTENDANCE_COLORS.present} stopOpacity={0} />
        </linearGradient>
        <linearGradient id={gradExpenses} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={ATTENDANCE_COLORS.absent} stopOpacity={0.25} />
          <stop offset="95%" stopColor={ATTENDANCE_COLORS.absent} stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "hsl(var(--muted-foreground))" }} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} tick={{ fill: "hsl(var(--muted-foreground))" }} />
        <Tooltip content={chartTooltipContent} />
        <Area
          type="monotone"
          dataKey="collected"
          stroke={ATTENDANCE_COLORS.present}
          strokeWidth={2}
          fill={`url(#${gradCollected})`}
          name={t("dashboard.charts.collected")}
          isAnimationActive={!prefersReduced}
        />
        <Area
          type="monotone"
          dataKey="expenses"
          stroke={ATTENDANCE_COLORS.absent}
          strokeWidth={2}
          fill={`url(#${gradExpenses})`}
          name={t("dashboard.charts.expenses")}
          isAnimationActive={!prefersReduced}
        />
    </AreaChart>
  );
});
