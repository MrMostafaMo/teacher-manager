import { useTranslation } from "react-i18next";
import { TrendingDown } from "lucide-react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardLink } from "@/shared/CardLink";
import { Avatar } from "@/shared/Avatar";
import type { DashboardData } from "@/features/dashboard/application/dashboard-cases";
import { formatMoney } from "@/lib/utils/format";

export function TopDebtorsCard({ debtors }: { debtors: DashboardData["topDebtors"] }) {
  const { t } = useTranslation();
  return (
    <CardLink to="/payments" label={t("dashboard.debtors.title")}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">{t("dashboard.debtors.title")}</CardTitle>
        <TrendingDown className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {debtors.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("dashboard.debtors.empty")}</p>
        ) : (
          <div className="divide-y">
            {debtors.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 py-2">
                <span className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={d.name} className="size-7 text-[10px]" />
                  <span className="truncate text-sm font-medium">{d.name}</span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-destructive" dir="ltr">
                  {formatMoney(d.remaining)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </CardLink>
  );
}
