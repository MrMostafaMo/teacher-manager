import type { LucideIcon } from "lucide-react";
import {
  CalendarCheck,
  ClipboardList,
  GraduationCap,
  Receipt,
  Scale,
  TrendingDown,
  Users,
  UserCheck,
  Wallet,
} from "lucide-react";
import type { DashboardData } from "@/features/dashboard/application/dashboard-cases";
import { formatMoney } from "@/lib/utils/format";

/** Accent color per KPI category (theme-aware CSS variables). */
export const KPI_COLOR: Record<string, string> = {
  totalStudents: "var(--chart-1)",
  activeStudents: "var(--chart-1)",
  attendanceRate: "var(--chart-2)",
  collected: "var(--chart-2)",
  expensesMonth: "var(--chart-4)",
  net: "var(--chart-1)",
  outstanding: "var(--chart-3)",
  homeworkCompletion: "var(--chart-5)",
  examAverage: "var(--chart-5)",
};

/** Precomputed 12% tint backgrounds (globals.css) — no runtime color-mix. */
export const KPI_TINT: Record<string, string> = {
  totalStudents: "var(--chart-tint-1)",
  activeStudents: "var(--chart-tint-1)",
  attendanceRate: "var(--chart-tint-2)",
  collected: "var(--chart-tint-2)",
  expensesMonth: "var(--chart-tint-4)",
  net: "var(--chart-tint-1)",
  outstanding: "var(--chart-tint-3)",
  homeworkCompletion: "var(--chart-tint-5)",
  examAverage: "var(--chart-tint-5)",
};

/** The page each KPI navigates to when clicked (undefined = not clickable). */
const KPI_ROUTE: Record<string, string> = {
  totalStudents: "/students",
  activeStudents: "/students",
  attendanceRate: "/attendance",
  collected: "/payments",
  expensesMonth: "/expenses",
  net: "/payments",
  outstanding: "/payments",
  homeworkCompletion: "/homework",
  examAverage: "/exams",
};

export type KpiItem = {
  key: string;
  value: string | number;
  icon: LucideIcon;
  delta?: number | null;
  invert?: boolean;
  to?: string;
};

export function buildKpis(data: DashboardData): KpiItem[] {
  return [
    { key: "totalStudents", value: data.totalStudents, icon: Users, to: KPI_ROUTE.totalStudents },
    {
      key: "activeStudents",
      value: data.activeStudents,
      icon: UserCheck,
      to: KPI_ROUTE.activeStudents,
    },
    {
      key: "attendanceRate",
      value: `${data.attendanceRate}%`,
      icon: CalendarCheck,
      delta: data.deltas.attendanceRate,
      to: KPI_ROUTE.attendanceRate,
    },
    {
      key: "collected",
      value: formatMoney(data.collected),
      icon: Wallet,
      delta: data.deltas.collected,
      to: KPI_ROUTE.collected,
    },
    {
      key: "expensesMonth",
      value: formatMoney(data.expensesMonth),
      icon: Receipt,
      delta: data.deltas.expenses,
      invert: true,
      to: KPI_ROUTE.expensesMonth,
    },
    {
      key: "net",
      value: formatMoney(data.net),
      icon: Scale,
      delta: data.deltas.net,
      to: KPI_ROUTE.net,
    },
    {
      key: "outstanding",
      value: formatMoney(data.outstanding),
      icon: TrendingDown,
      to: KPI_ROUTE.outstanding,
    },
    {
      key: "homeworkCompletion",
      value: `${data.homeworkCompletion}%`,
      icon: ClipboardList,
      to: KPI_ROUTE.homeworkCompletion,
    },
    {
      key: "examAverage",
      value: data.examAverage === null ? "—" : `${data.examAverage}%`,
      icon: GraduationCap,
      to: KPI_ROUTE.examAverage,
    },
  ];
}
