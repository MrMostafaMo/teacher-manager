import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDataChanged } from "@/shared/useDataChanged";
import {
  getDashboardData,
  type DashboardData,
} from "@/features/dashboard/application/dashboard-cases";
import { useSessionSettings } from "@/lib/session-settings-store";
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
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const billingMode = useSessionSettings((s) => s.billingMode);
  const sessionsPerCycle = useSessionSettings((s) => s.sessionsPerCycle);
  const warningAt = useSessionSettings((s) => s.warningAt);

  useEffect(() => {
    let cancelled = false;
    if (!data) setStatus("loading");
    void (async () => {
      try {
        const d = await getDashboardData(selectedMonth, { billingMode, sessionsPerCycle, warningAt });
        if (!cancelled) {
          setData(d);
          setStatus("ready");
        }
      } catch (err) {
        console.error("Dashboard load failed", err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedMonth, reloadKey, billingMode, sessionsPerCycle, warningAt]);

  useDataChanged(() => setReloadKey((k) => k + 1));

  if (status === "error") {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 p-6 text-sm text-muted-foreground">
          <p>{t("dashboard.loadError")}</p>
          {error && (
            <>
              <textarea
                readOnly
                value={error}
                aria-label="error-detail"
                className="w-72 resize-none rounded border bg-muted px-3 py-2 font-mono text-xs"
                rows={3}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => void navigator.clipboard.writeText(error)}
              >
                {t("error.copyDetails")}
              </Button>
            </>
          )}
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
