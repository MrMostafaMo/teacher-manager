import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { NotebookPen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData } from "@/features/dashboard/application/dashboard-cases";
import { formatDateString } from "@/lib/utils/format";

export function OverdueHomeworksCard({ items }: { items: DashboardData["overdueHomeworks"] }) {
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
          <div className="divide-y">
            {items.map((h) => (
              <Link
                key={h.id}
                to={`/homework?group=${h.groupId}`}
                aria-label={h.title}
                className="block py-2.5 transition-colors first:pt-0 last:pb-0 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-medium">{h.title}</p>
                  <span
                    className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap tabular-nums text-destructive"
                    dir="ltr"
                  >
                    {formatDateString(h.dueDate)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {h.groupName ?? "—"} · {t("dashboard.overdue.pending", { count: h.pending })}
                </p>
              </Link>
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
