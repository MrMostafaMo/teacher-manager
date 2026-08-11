import { useTranslation } from "react-i18next";
import { ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils/format";
import {
  ATTENDANCE_COLORS,
  HOMEWORK_STATUS_KEYS,
  type AttendancePoint,
  type FinancePoint,
  type HomeworkSlice,
} from "./dashboard-chart-data";
import {
  AttendanceTrendChart,
  FinanceAreaChart,
  HomeworkPieChart,
  LazyChart,
} from "./dashboard-charts";

export function AttendanceHomeworkCharts({
  attendanceChart,
  homeworkPie,
  homeworkCount,
}: {
  attendanceChart: AttendancePoint[];
  homeworkPie: HomeworkSlice[];
  homeworkCount: number;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t("dashboard.charts.attendance")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <LazyChart className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AttendanceTrendChart data={attendanceChart} />
            </ResponsiveContainer>
          </LazyChart>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {(
              [
                { key: "present", fill: ATTENDANCE_COLORS.present, label: t("attendance.statusPresent") },
                { key: "late", fill: ATTENDANCE_COLORS.late, label: t("attendance.statusLate") },
                { key: "absent", fill: ATTENDANCE_COLORS.absent, label: t("attendance.statusAbsent") },
                { key: "excused", fill: ATTENDANCE_COLORS.excused, label: t("attendance.statusExcused") },
              ]
            ).map((item) => (
              <span key={item.key} className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                {item.label}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t("dashboard.charts.homework")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <LazyChart className="h-44" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <HomeworkPieChart data={homeworkPie} />
            </ResponsiveContainer>
          </LazyChart>
          {homeworkCount > 0 && (
            <ul className="space-y-1.5 text-sm">
              {homeworkPie.map((s) => (
                <li key={s.key} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: s.fill }} />
                    {t(HOMEWORK_STATUS_KEYS[s.key as keyof typeof HOMEWORK_STATUS_KEYS])}
                  </span>
                  <span className="tabular-nums text-muted-foreground">{formatNumber(s.value)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function FinanceCharts({ financeChart }: { financeChart: FinancePoint[] }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t("dashboard.charts.finance")}</CardTitle>
        </CardHeader>
        <CardContent>
          <LazyChart className="h-56" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <FinanceAreaChart data={financeChart} kind="both" />
            </ResponsiveContainer>
          </LazyChart>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: ATTENDANCE_COLORS.present }} />
              {t("dashboard.charts.collected")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: ATTENDANCE_COLORS.absent }} />
              {t("dashboard.charts.expenses")}
            </span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t("dashboard.charts.financeNet")}</CardTitle>
        </CardHeader>
        <CardContent>
          <LazyChart className="h-56" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <FinanceAreaChart data={financeChart} kind="net" />
            </ResponsiveContainer>
          </LazyChart>
        </CardContent>
      </Card>
    </div>
  );
}
