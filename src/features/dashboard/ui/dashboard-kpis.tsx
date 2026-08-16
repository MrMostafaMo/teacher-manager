import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import {
  CalendarCheck,
  ClipboardList,
  GraduationCap,
  Receipt,
  Scale,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardData } from "@/features/dashboard/application/dashboard-cases";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/utils/format";
import { useCountUp } from "@/shared/useCountUp";

/** Accent color per KPI category (theme-aware CSS variables). */
const KPI_COLOR: Record<string, string> = {
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
const KPI_TINT: Record<string, string> = {
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

function AnimatedValue({ value }: { value: string | number }) {
  const numeric = typeof value === "number" ? value : parseInt(String(value).replace(/[^0-9-]/g, ""), 10);
  const animated = useCountUp(Number.isFinite(numeric) ? numeric : 0, 800);
  if (!Number.isFinite(numeric)) return <>{value}</>;
  const prefix = String(value).match(/^[^0-9-]*/)?.[0] ?? "";
  const suffix = String(value).match(/[^0-9]*$/)?.[0] ?? "";
  return <>{prefix}{animated}{suffix}</>;
}

function KpiDelta({ delta, invert }: { delta: number | null; invert?: boolean }) {
  if (delta === null) return null;
  const good = invert ? delta < 0 : delta >= 0;
  return (
    <span
      dir="ltr"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
        good ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
      )}
    >
      {delta >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {delta >= 0 ? "+" : ""}
      {delta}%
    </span>
  );
}

export function buildKpis(data: DashboardData): KpiItem[] {
  return [
    { key: "totalStudents", value: data.totalStudents, icon: Users, to: KPI_ROUTE.totalStudents },
    { key: "activeStudents", value: data.activeStudents, icon: UserCheck, to: KPI_ROUTE.activeStudents },
    { key: "attendanceRate", value: `${data.attendanceRate}%`, icon: CalendarCheck, delta: data.deltas.attendanceRate, to: KPI_ROUTE.attendanceRate },
    { key: "collected", value: formatMoney(data.collected), icon: Wallet, delta: data.deltas.collected, to: KPI_ROUTE.collected },
    { key: "expensesMonth", value: formatMoney(data.expensesMonth), icon: Receipt, delta: data.deltas.expenses, invert: true, to: KPI_ROUTE.expensesMonth },
    { key: "net", value: formatMoney(data.net), icon: Scale, delta: data.deltas.net, to: KPI_ROUTE.net },
    { key: "outstanding", value: formatMoney(data.outstanding), icon: TrendingDown, to: KPI_ROUTE.outstanding },
    { key: "homeworkCompletion", value: `${data.homeworkCompletion}%`, icon: ClipboardList, to: KPI_ROUTE.homeworkCompletion },
    { key: "examAverage", value: data.examAverage === null ? "—" : `${data.examAverage}%`, icon: GraduationCap, to: KPI_ROUTE.examAverage },
  ];
}

export function KpiGrid({ kpis }: { kpis: KpiItem[] }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {kpis.map((kpi, i) => {
        const { key, value, icon: Icon, delta, invert, to } = kpi;
        const accent = KPI_COLOR[key];
        const body = (
          <CardContent className="flex items-start justify-between gap-2 p-4">
            <div className="min-w-0 space-y-2">
              <span className="block truncate text-xs text-muted-foreground">
                {t(`dashboard.kpis.${key}`)}
              </span>
              <div className="text-2xl font-semibold tabular-nums">
                <AnimatedValue value={value} />
              </div>
              {delta !== undefined && <KpiDelta delta={delta} invert={invert} />}
            </div>
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-foreground/5 animate-[pulse_0.6s_ease-in-out_1]"
              style={{ color: accent, backgroundColor: KPI_TINT[key] }}
            >
              <Icon className="size-4.5" />
            </span>
          </CardContent>
        );
        return (
          <Card
            key={key}
            style={{
              boxShadow: "var(--kpi-shadow)",
              animationDelay: `${i * 50}ms`,
              backgroundImage: `linear-gradient(135deg, ${KPI_TINT[key]}, transparent)`,
            }}
            className={cn(
              "animate-in fade-in slide-in-from-bottom-2 fill-mode-both transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--card-shadow-hover)] hover:ring-primary/10",
              to && "hover:ring-primary/30",
            )}
          >
            {to ? (
              <Link
                to={to}
                aria-label={t(`dashboard.kpis.${key}`)}
                className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {body}
              </Link>
            ) : (
              body
            )}
          </Card>
        );
      })}
    </div>
  );
}
