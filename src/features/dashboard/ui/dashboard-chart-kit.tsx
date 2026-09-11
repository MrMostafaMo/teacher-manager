import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { RechartsTooltip } from "@/shared/chart-legend";
import { useInView } from "@/shared/useInView";

/** Stable tooltip element so recharts doesn't remount it on every render. */
export const chartTooltipContent = <RechartsTooltip />;

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
