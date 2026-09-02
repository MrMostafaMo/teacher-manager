import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder grid for the dashboard's KPI cards while data loads. */
export function KpiGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="min-h-[88px]">
          <CardContent className="space-y-2 p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="mt-1 h-4 w-12" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Placeholder rows inside a bordered table while rows load. */
export function TableRowsSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="flex min-h-[200px] flex-col justify-center overflow-x-auto">
      <div className="w-full text-sm">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-6 border-b px-4 py-2.5 last:border-0">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={c === 0 ? "h-4 max-w-48 flex-1" : "h-4 flex-1"} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Placeholder lines for dialogs / detail panes while they load. */
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}
