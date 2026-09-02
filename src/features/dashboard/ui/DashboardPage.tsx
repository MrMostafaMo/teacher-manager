import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { useDataChanged } from "@/shared/useDataChanged";
import {
  getDashboardData,
  type DashboardData,
} from "@/features/dashboard/application/dashboard-cases";
import { currentMonth } from "@/features/dashboard/application/dashboard-helpers";
import { DashboardSkeleton } from "./DashboardSkeleton";
import { DashboardContent } from "./dashboard-content";

type ChartStatus = "loading" | "ready" | "error";

export default function DashboardPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedMonth = searchParams.get("month") ?? currentMonth();
  const [status, setStatus] = useState<ChartStatus>("loading");
  const [data, setData] = useState<DashboardData | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!data) setStatus("loading");
    void (async () => {
      try {
        const d = await getDashboardData(selectedMonth);
        if (!cancelled) {
          setData(d);
          setStatus("ready");
        }
      } catch (error) {
        console.error("Dashboard load failed", error);
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedMonth, reloadKey]);

  useDataChanged(() => setReloadKey((k) => k + 1));

  if (status === "error") {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          {t("dashboard.loadError")}
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return <DashboardSkeleton />;
  }

  return (
    <DashboardContent
      data={data}
      selectedMonth={selectedMonth}
      onMonthChange={(month) => setSearchParams(month ? { month } : {})}
    />
  );
}
