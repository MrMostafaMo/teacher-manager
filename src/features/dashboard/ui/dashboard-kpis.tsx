import { useTranslation } from "react-i18next";
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

export type KpiItem = {
  key: string;
  value: string | number;
  icon: LucideIcon;
  delta?: number | null;
  invert?: boolean;
};

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
    { key: "totalStudents", value: data.totalStudents, icon: Users },
    { key: "activeStudents", value: data.activeStudents, icon: UserCheck },
    { key: "attendanceRate", value: `${data.attendanceRate}%`, icon: CalendarCheck, delta: data.deltas.attendanceRate },
    { key: "collected", value: formatMoney(data.collected), icon: Wallet, delta: data.deltas.collected },
    { key: "expensesMonth", value: formatMoney(data.expensesMonth), icon: Receipt, delta: data.deltas.expenses, invert: true },
    { key: "net", value: formatMoney(data.net), icon: Scale, delta: data.deltas.net },
    { key: "outstanding", value: formatMoney(data.outstanding), icon: TrendingDown },
    { key: "homeworkCompletion", value: `${data.homeworkCompletion}%`, icon: ClipboardList },
    { key: "examAverage", value: data.examAverage === null ? "—" : String(data.examAverage), icon: GraduationCap },
  ];
}

export function KpiGrid({ kpis }: { kpis: KpiItem[] }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {kpis.map(({ key, value, icon: Icon, delta, invert }) => {
        const accent = KPI_COLOR[key];
        return (
          <Card
            key={key}
            style={{ boxShadow: "var(--kpi-shadow)" }}
            className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--card-shadow-hover)] hover:ring-primary/10"
          >
            <CardContent className="flex items-start justify-between gap-2 p-4">
              <div className="min-w-0 space-y-2">
                <span className="block truncate text-xs text-muted-foreground">
                  {t(`dashboard.kpis.${key}`)}
                </span>
                <div className="text-2xl font-semibold tabular-nums">{value}</div>
                {delta !== undefined && <KpiDelta delta={delta} invert={invert} />}
              </div>
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                style={{ color: accent, backgroundColor: KPI_TINT[key] }}
              >
                <Icon className="size-4" />
              </span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
