import { useTranslation } from "react-i18next";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardLink } from "@/shared/CardLink";
import type { DashboardData } from "@/features/dashboard/application/dashboard-cases";

export function WeakSkillsCard({
  skills,
  totalStudents,
}: {
  skills: DashboardData["weakSkills"];
  totalStudents: number;
}) {
  const { t } = useTranslation();
  return (
    <CardLink to="/skills" label={t("dashboard.charts.weakSkills")}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{t("dashboard.charts.weakSkills")}</CardTitle>
      </CardHeader>
      <CardContent>
        {skills.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("dashboard.empty")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {skills.map((s) => (
              <div key={s.name} className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm">{s.name}</span>
                  <span className="tabular-nums text-xs text-muted-foreground">{s.count}</span>
                </div>
                <div className="flex h-20 items-end gap-1">
                  <div
                    className="w-full rounded-t bg-warning"
                    style={{
                      height: `${Math.max(8, Math.min(100, (s.count / totalStudents) * 100))}%`,
                    }}
                  />
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-warning"
                    style={{ width: `${Math.min(100, (s.count / totalStudents) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </CardLink>
  );
}
