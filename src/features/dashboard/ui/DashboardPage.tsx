import { memo, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { MonthPicker } from "@/shared/month-picker";
import {
  getDashboardData,
  type DashboardData,
} from "@/features/dashboard/application/dashboard-cases";
import { currentMonth } from "@/features/dashboard/application/dashboard-helpers";
import {
  HOMEWORK_COLORS,
  monthShort,
  type AttendancePoint,
  type FinancePoint,
  type HomeworkSlice,
} from "./dashboard-chart-data";
import { DashboardSkeleton } from "./DashboardSkeleton";
import { buildKpis } from "./dashboard-kpi-data";
import { KpiGrid } from "./dashboard-kpis";
import { DashboardQuickActions } from "./DashboardQuickActions";
import {
  TodaySessionsCard,
  OverdueHomeworksCard,
  TopDebtorsCard,
  WeakPointsCard,
  WeakSkillsCard,
} from "./DashboardSectionCards";
import { AttendanceHomeworkCharts, FinanceCharts } from "./DashboardChartsSection";

type ChartStatus = "loading" | "ready" | "error";

export default function DashboardPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedMonth = searchParams.get("month") ?? currentMonth();
  const [status, setStatus] = useState<ChartStatus>("loading");
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
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
  }, [selectedMonth]);

  if (status === "error") {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          {t("dashboard.loadError")}
        </CardContent>
      </Card>
    );
  }

  if (status !== "ready" || !data) {
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

/** The loaded dashboard: hooks live here so the loading guards can't break hook order. */
const DashboardContent = memo(function DashboardContent({
  data,
  selectedMonth,
  onMonthChange,
}: {
  data: DashboardData;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}) {
  const { t } = useTranslation();

  const attendanceChart = useMemo<AttendancePoint[]>(
    () =>
      data.attendanceTrend.map((r) => ({
        month: monthShort(r.month),
        present: r.present,
        late: r.late,
        absent: r.absent,
        excused: r.excused,
      })),
    [data],
  );

  const financeChart = useMemo<FinancePoint[]>(
    () =>
      data.financeTrend.map((r) => ({
        month: monthShort(r.month),
        collected: r.collected,
        expenses: r.expenses,
        net: r.collected - r.expenses,
      })),
    [data],
  );

  const homeworkPie = useMemo<HomeworkSlice[]>(
    () => [
      {
        key: "submitted",
        value: data.homeworkSubmitted,
        fill: HOMEWORK_COLORS.submitted,
        label: t("homework.statusSubmitted"),
      },
      {
        key: "pending",
        value: data.homeworkPending,
        fill: HOMEWORK_COLORS.pending,
        label: t("homework.statusPending"),
      },
      {
        key: "late",
        value: data.homeworkLate,
        fill: HOMEWORK_COLORS.late,
        label: t("homework.statusLate"),
      },
    ],
    [data, t],
  );

  const kpis = useMemo(() => buildKpis(data), [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t("dashboard.monthLabel")}</p>
        <MonthPicker
          value={selectedMonth}
          onChange={onMonthChange}
          ariaLabel={t("dashboard.selectMonth")}
        />
      </div>
      <DashboardQuickActions newStudents={data.deltas.newStudents} />
      <KpiGrid kpis={kpis} />
      <TodaySessionsCard sessions={data.todaySessions} />
      <OverdueHomeworksCard items={data.overdueHomeworks} />
      <TopDebtorsCard debtors={data.topDebtors} />
      <WeakPointsCard items={data.topWeakPoints} />
      <AttendanceHomeworkCharts
        attendanceChart={attendanceChart}
        homeworkPie={homeworkPie}
        homeworkCount={data.homeworkCount}
      />
      <FinanceCharts financeChart={financeChart} />
      <WeakSkillsCard skills={data.weakSkills} totalStudents={data.totalStudents} />
    </div>
  );
});
