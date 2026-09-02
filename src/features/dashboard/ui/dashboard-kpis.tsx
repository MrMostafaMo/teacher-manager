import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/shared/useCountUp";
import { KPI_COLOR, KPI_TINT, type KpiItem } from "./dashboard-kpi-data";

function AnimatedValue({ value }: { value: string | number }) {
  const str = String(value);
  const match = str.match(/-?[\d,]+(\.\d+)?/);
  const numeric = match ? parseFloat(match[0].replace(/,/g, "")) : NaN;
  const animated = useCountUp(Number.isFinite(numeric) ? numeric : 0, 800);
  if (!Number.isFinite(numeric) || !match) return <>{value}</>;
  const prefix = str.slice(0, match.index);
  const suffix = str.slice((match.index ?? 0) + match[0].length);
  const decimals = match[0].includes(".") ? match[0].split(".")[1].length : 0;
  const display = animated.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (
    <>
      {prefix}
      {display}
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
        const { key, value, icon: Icon, delta, invert, to } = kpi;
        const accent = KPI_COLOR[key];
        const body = (
          <CardContent className="relative z-10 flex h-full items-start justify-between gap-2 p-4">
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
              boxShadow: "var(--kpi-shadow)",
              animationDelay: `${i * 50}ms`,
              backgroundImage: `linear-gradient(135deg, ${KPI_TINT[key]}, transparent)`,
            }}
            className={cn(
              "relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 fill-mode-both transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--card-shadow-hover)] hover:ring-primary/10",
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
