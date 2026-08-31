import { useTranslation } from "react-i18next";
import { Clock3 } from "lucide-react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardLink } from "@/shared/CardLink";
import { Avatar } from "@/shared/Avatar";
type CardRow = { student: { id: string; name: string }; count: number; remainingSessions: number; status: "ok" | "warning" | "due"; isOverdue?: boolean; cyclesOverdue?: number; showPaid?: boolean };

export function SessionDuesCard({ rows }: { rows: CardRow[] }) {
  const { t } = useTranslation();
  const filtered = rows.slice(0, 5);
  return (
    <CardLink to="/payments" label={t("dashboard.sessions.title")}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">{t("dashboard.sessions.title")}</CardTitle>
        <Clock3 className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("dashboard.sessions.empty")}</p>
        ) : (
          <div className="divide-y">
            {filtered.map((r) => (
              <div key={r.student.id} className="flex items-center justify-between gap-3 py-2">
                <span className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={r.student.name} className="size-7 text-[10px]" />
                  <span className="truncate text-sm font-medium">{r.student.name}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-sm tabular-nums" dir="ltr">{r.count}/{r.count + r.remainingSessions}</span>
                  <Badge variant={r.status === "due" ? "destructive" : "secondary"}>
                    {r.status === "due" ? t("dashboard.sessions.due") : t("dashboard.sessions.warning")}
                  </Badge>
                  {r.isOverdue && (
                    <Badge variant="outline" className="border-destructive/40 text-destructive text-[10px] px-1 py-0">
                      {r.cyclesOverdue != null && r.cyclesOverdue > 1
                        ? t("payments.sessions.unpaidCycles", { count: r.cyclesOverdue })
                        : t("payments.sessions.unpaid")}
                    </Badge>
                  )}
                  {r.showPaid && !r.isOverdue && (
                    <Badge variant="outline" className="border-success/40 text-success text-[10px] px-1 py-0">
                      {t("payments.sessions.paid")}
                    </Badge>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </CardLink>
  );
}
