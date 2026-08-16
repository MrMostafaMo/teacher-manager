import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils/format";
import { useInView } from "@/shared/useInView";

/** Theme-aware tooltip shared by the dashboard charts. */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-(--popover-shadow)">
      <p className="mb-1 font-medium">{label}</p>
      <div className="space-y-1">
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: p.color ?? p.payload?.fill }}
            />
            <span className="text-muted-foreground">{p.name}</span>
            <span className="ms-auto font-semibold tabular-nums" dir="ltr">
              {typeof p.value === "number" ? formatNumber(p.value) : p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Stable tooltip element so recharts doesn't remount it on every render. */
export const chartTooltipContent = <ChartTooltip />;

/**
 * Mounts children only once the wrapper is (near) the viewport; shows a
 * same-sized skeleton until then so nothing shifts or flickers. Fixed-height
 * chart containers mean the skeleton occupies exactly the chart's slot.
 */
export function LazyChart({
  className,
  dir,
  children,
}: {
  className: string;
  dir?: string;
  children: ReactNode;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={className} dir={dir}>
      {inView ? children : <Skeleton className="h-full w-full" />}
    </div>
  );
}
