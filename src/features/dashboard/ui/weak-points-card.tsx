import { useTranslation } from "react-i18next";
import { TriangleAlert } from "lucide-react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardLink } from "@/shared/CardLink";
import { Avatar } from "@/shared/Avatar";
import type { DashboardData } from "@/features/dashboard/application/dashboard-cases";

export function WeakPointsCard({
  items,
}: {
  items: DashboardData["topWeakPoints"];
}) {
  const { t } = useTranslation();
  return (
    <CardLink to="/weak-points" label={t("dashboard.weakPoints.title")}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">{t("dashboard.weakPoints.title")}</CardTitle>
        <TriangleAlert className="size-4 text-warning" />
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("dashboard.weakPoints.empty")}</p>
        ) : (
          <div className="divide-y">
            {items.map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-3 py-2">
                <span className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={w.name} className="size-7 text-[10px]" />
                  <span className="truncate text-sm font-medium">{w.name}</span>
                </span>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-xs text-muted-foreground">{w.latest}</span>
                  <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-warning">
                    {t("dashboard.weakPoints.count", { count: w.count })}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </CardLink>
  );
}
