import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/shared/useCountUp";
import { KPI_COLOR, KPI_TINT, type KpiItem } from "./dashboard-kpi-data";

function AnimatedValue({ value }: { value: string | number }) {
  const numeric =
    typeof value === "number" ? value : parseInt(String(value).replace(/[^0-9-]/g, ""), 10);
  const animated = useCountUp(Number.isFinite(numeric) ? numeric : 0, 800);
  if (!Number.isFinite(numeric)) return <>{value}</>;
  const prefix = String(value).match(/^[^0-9-]*/)?.[0] ?? "";
  const suffix = String(value).match(/[^0-9]*$/)?.[0] ?? "";
  return (
    <>
      {prefix}
      {animated}
      {suffix}
    </>
  );
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
