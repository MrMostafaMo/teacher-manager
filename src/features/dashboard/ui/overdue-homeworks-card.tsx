import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { NotebookPen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData } from "@/features/dashboard/application/dashboard-cases";
import { formatDateString } from "@/lib/utils/format";

export function OverdueHomeworksCard({
  items,
}: {
  items: DashboardData["overdueHomeworks"];
}) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">{t("dashboard.overdue.title")}</CardTitle>
        <NotebookPen className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("dashboard.overdue.empty")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((h) => (
              <div key={h.id} className="rounded-lg border bg-muted/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{h.title}</p>
                  <span className="shrink-0 text-xs tabular-nums text-destructive" dir="ltr">
                    {formatDateString(h.dueDate)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {h.groupName ?? "—"} · {t("dashboard.overdue.pending", { count: h.pending })}
                </p>
              </div>
            ))}
          </div>
        )}
        {items.length > 0 && (
          <Link to="/homework" className="mt-3 inline-block text-xs font-medium hover:underline">
            {t("dashboard.overdue.viewAll")}
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
