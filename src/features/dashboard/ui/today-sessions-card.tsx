import { useTranslation } from "react-i18next";
import { CalendarDays } from "lucide-react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardLink } from "@/shared/CardLink";
import type { DashboardData } from "@/features/dashboard/application/dashboard-cases";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils/format";
import { useTimeStore } from "@/lib/time-store";

export function TodaySessionsCard({ sessions }: { sessions: DashboardData["todaySessions"] }) {
  const { t } = useTranslation();
  const hour24 = useTimeStore((s) => s.hour24);
  return (
    <CardLink to="/schedule" label={t("dashboard.today.title")}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">{t("dashboard.today.title")}</CardTitle>
        <CalendarDays className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("dashboard.today.empty")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {sessions.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "rounded-lg border p-3",
                  s.finished ? "bg-muted/20 opacity-70" : "bg-muted/40",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{s.groupName}</p>
                  {s.finished && (
                    <Badge variant="secondary" className="shrink-0 text-[11px]">
                      {t("dashboard.today.finished")}
                    </Badge>
                  )}
                </div>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {formatTime(s.startTime, hour24)} – {formatTime(s.endTime, hour24)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.room ? `${t("schedule.room")}: ${s.room}` : t("schedule.noRoom")}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </CardLink>
  );
}
