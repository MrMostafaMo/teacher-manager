import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils/format";

export function LegendDot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("size-2.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: color }}
    />
  );
}

/** Shared recharts tooltip: theme surface, dot + name + formatted value rows. */
export function RechartsTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  format?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const fmt = format ?? ((v: number) => formatNumber(v));
  return (
    <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-(--popover-shadow)">
      {label !== undefined && <p className="mb-1 font-medium">{label}</p>}
      <div className="space-y-1">
        {payload.map((p: any, i: number) => (
          <div key={p.dataKey ?? p.name ?? i} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: p.color ?? p.payload?.fill ?? p.fill }}
            />
            <span className="text-muted-foreground">{p.name}</span>
            <span className="ms-auto font-semibold tabular-nums" dir="ltr">
              {typeof p.value === "number" ? fmt(p.value) : p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
