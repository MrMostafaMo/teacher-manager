import { memo } from "react";
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
  return (
    <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
      <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
      <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
      <Tooltip content={chartTooltipContent} />
      <Bar dataKey="present" stackId="a" fill={ATTENDANCE_COLORS.present} name={t("attendance.statusPresent")} />
      <Bar dataKey="late" stackId="a" fill={ATTENDANCE_COLORS.late} name={t("attendance.statusLate")} />
      <Bar dataKey="absent" stackId="a" fill={ATTENDANCE_COLORS.absent} name={t("attendance.statusAbsent")} />
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

/** Homework status donut. Re-renders only when `data` changes. */
export const HomeworkPieChart = memo(function HomeworkPieChart({ data }: { data: HomeworkSlice[] }) {
  return (
    <PieChart>
      <Pie
        data={data}
        dataKey="value"
        nameKey="label"
        innerRadius={45}
        outerRadius={70}
        paddingAngle={2}
      >
        {data.map((s) => (
          <Cell key={s.key} fill={s.fill} />
        ))}
      </Pie>
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
  if (kind === "net") {
    return (
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id="gradNet" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={ATTENDANCE_COLORS.excused} stopOpacity={0.25} />
            <stop offset="95%" stopColor={ATTENDANCE_COLORS.excused} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} />
        <Tooltip content={chartTooltipContent} />
        <Area
          type="monotone"
          dataKey="net"
          stroke={ATTENDANCE_COLORS.excused}
          strokeWidth={2}
          fill="url(#gradNet)"
          name={t("dashboard.charts.net")}
        />
      </AreaChart>
    );
  }
  return (
    <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
      <defs>
        <linearGradient id="gradCollected" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={ATTENDANCE_COLORS.present} stopOpacity={0.25} />
          <stop offset="95%" stopColor={ATTENDANCE_COLORS.present} stopOpacity={0} />
        </linearGradient>
        <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={ATTENDANCE_COLORS.absent} stopOpacity={0.25} />
          <stop offset="95%" stopColor={ATTENDANCE_COLORS.absent} stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
      <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
      <YAxis tickLine={false} axisLine={false} fontSize={12} />
      <Tooltip content={chartTooltipContent} />
      <Area
        type="monotone"
        dataKey="collected"
        stroke={ATTENDANCE_COLORS.present}
        strokeWidth={2}
        fill="url(#gradCollected)"
        name={t("dashboard.charts.collected")}
      />
      <Area
        type="monotone"
        dataKey="expenses"
        stroke={ATTENDANCE_COLORS.absent}
        strokeWidth={2}
        fill="url(#gradExpenses)"
        name={t("dashboard.charts.expenses")}
      />
    </AreaChart>
  );
});
