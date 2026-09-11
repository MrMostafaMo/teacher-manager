import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils/format";
import { useCountUp } from "@/shared/useCountUp";
import { KPI_COLOR, KPI_TINT, type KpiItem } from "./dashboard-kpi-data";

function AnimatedValue({ numeric, formatted }: { numeric: number; formatted: string }) {
  const animated = useCountUp(Number.isFinite(numeric) ? numeric : 0, 800);
  if (!Number.isFinite(numeric)) return <>{formatted}</>;
  const match = formatted.match(/-?[\d,]+(\.\d+)?/);
  if (!match || match.index === undefined) return <>{formatted}</>;
  const decimals = match[1] ? match[1].length - 1 : 0;
  const display = formatNumber(animated, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (
    <>
      {formatted.slice(0, match.index)}
      {display}
      {formatted.slice(match.index + match[0].length)}
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

function DecorativeSparkline({ delta }: { delta?: number | null }) {
  if (delta === undefined || delta === null) return null;
  
  return (
    <svg 
      className="absolute bottom-0 left-0 right-0 h-16 w-full opacity-[0.04] pointer-events-none text-foreground dark:opacity-[0.08]" 
      preserveAspectRatio="none" 
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      {delta >= 0 ? (
        <path d="M0,100 C20,80 40,90 60,40 C80,-10 90,20 100,10 L100,100 Z" fill="currentColor" />
      ) : (
        <path d="M0,10 C20,20 40,-10 60,40 C80,90 90,80 100,100 L100,100 L0,100 Z" fill="currentColor" />
      )}
    </svg>
  );
}

export function KpiGrid({ kpis }: { kpis: KpiItem[] }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {kpis.map((kpi, i) => {
        const { key, numeric, formatted, icon: Icon, delta, invert, to } = kpi;
        const accent = KPI_COLOR[key];
        const body = (
          <CardContent className="relative z-10 flex h-full items-start justify-between gap-2 p-4">
            <div className="min-w-0 space-y-2">
              <span className="block truncate text-xs text-muted-foreground">
                {t(`dashboard.kpis.${key}`)}
              </span>
              <div className="text-2xl font-semibold tabular-nums">
                <AnimatedValue numeric={numeric} formatted={formatted} />
              </div>
              {delta !== undefined && (
                <div className="mt-2 border-t border-border/50 pt-2">
                  <KpiDelta delta={delta} invert={invert} />
                </div>
              )}
            </div>
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-foreground/5"
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
              animationDelay: `${i * 60}ms`,
              backgroundImage: `linear-gradient(135deg, ${KPI_TINT[key]}, transparent)`,
            }}
            className={cn(
              "relative overflow-hidden shadow-(--kpi-shadow) animate-in fade-in slide-in-from-bottom-1 fill-mode-both transition-[transform,box-shadow,border-color] duration-500 motion-reduce:animate-none hover:-translate-y-0.5 hover:shadow-[var(--card-shadow-hover)] hover:ring-primary/10",
              to && "hover:ring-primary/30",
            )}
          >
            <DecorativeSparkline delta={delta} />
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
