import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  NotebookPen,
  Receipt,
  UserCheck,
  Users,
  Wallet,
  Scale,
  TrendingDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiGridSkeleton } from "@/shared/Skeletons";
import { PageHeader } from "@/shared/PageHeader";
import { getDashboardData, type DashboardData } from "@/features/dashboard/application/dashboard-cases";
import { cn } from "@/lib/utils";
import { formatDateString, formatMoney, formatNumber, formatTime } from "@/lib/utils/format";
import { useTimeStore } from "@/lib/time-store";

type ChartStatus = "loading" | "ready" | "error";

const ATTENDANCE_COLORS = {
  present: "var(--chart-2)",
  late: "var(--chart-3)",
  absent: "var(--chart-4)",
  excused: "var(--chart-5)",
};
const HOMEWORK_COLORS = {
  submitted: "var(--chart-2)",
  pending: "var(--muted-foreground)",
  late: "var(--chart-3)",
};
const HOMEWORK_STATUS_KEYS = {
  submitted: "homework.statusSubmitted",
  pending: "homework.statusPending",
  late: "homework.statusLate",
} as const;

/** Accent color per KPI category (theme-aware CSS variables). */
const KPI_COLOR: Record<string, string> = {
  totalStudents: "var(--chart-1)",
  activeStudents: "var(--chart-1)",
  attendanceRate: "var(--chart-2)",
  collected: "var(--chart-2)",
  expensesMonth: "var(--chart-4)",
  net: "var(--chart-1)",
  outstanding: "var(--chart-3)",
  homeworkCompletion: "var(--chart-5)",
  examAverage: "var(--chart-5)",
};

/** Theme-aware tooltip shared by the dashboard charts. */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      <div className="space-y-1">
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: p.color ?? p.payload?.fill }}
            />
            <span className="text-muted-foreground">{p.name}</span>
            <span className="ms-auto font-semibold tabular-nums" dir="ltr">
              {typeof p.value === "number" ? formatNumber(p.value) : p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function monthShort(iso: string): string {
  const [y, m] = iso.split("-");
  return `${m}/${y.slice(2)}`;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <KpiGridSkeleton count={9} />

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="size-4" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2 rounded-lg border p-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="size-4" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2 rounded-lg border p-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="size-4" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-64 w-full" />
            <div className="flex gap-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-center">
              <Skeleton className="size-36 rounded-full" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const hour24 = useTimeStore((s) => s.hour24);
  const [status, setStatus] = useState<ChartStatus>("loading");
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const d = await getDashboardData();
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
  }, []);

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

  const attendanceChart = data.attendanceTrend.map((r) => ({
    month: monthShort(r.month),
    present: r.present,
    late: r.late,
    absent: r.absent,
    excused: r.excused,
  }));

  const homeworkPie = [
    { key: "submitted", value: data.homeworkSubmitted, fill: HOMEWORK_COLORS.submitted, label: t("homework.statusSubmitted") },
    { key: "pending", value: data.homeworkPending, fill: HOMEWORK_COLORS.pending, label: t("homework.statusPending") },
    { key: "late", value: data.homeworkLate, fill: HOMEWORK_COLORS.late, label: t("homework.statusLate") },
  ];

  const kpis = [
    { key: "totalStudents", value: data.totalStudents, icon: Users },
    { key: "activeStudents", value: data.activeStudents, icon: UserCheck },
    { key: "attendanceRate", value: `${data.attendanceRate}%`, icon: CalendarCheck },
    { key: "collected", value: formatMoney(data.collected), icon: Wallet },
    { key: "expensesMonth", value: formatMoney(data.expensesMonth), icon: Receipt },
    { key: "net", value: formatMoney(data.net), icon: Scale },
    { key: "outstanding", value: formatMoney(data.outstanding), icon: TrendingDown },
    { key: "homeworkCompletion", value: `${data.homeworkCompletion}%`, icon: ClipboardList },
    { key: "examAverage", value: data.examAverage === null ? "—" : String(data.examAverage), icon: GraduationCap },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("dashboard.welcome")} description={t("dashboard.subtitle")} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {kpis.map(({ key, value, icon: Icon }) => {
          const accent = KPI_COLOR[key];
          return (
            <Card
              key={key}
              className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <CardContent className="flex items-start justify-between gap-2 p-4">
                <div className="min-w-0 space-y-2">
                  <span className="block truncate text-xs text-muted-foreground">
                    {t(`dashboard.kpis.${key}`)}
                  </span>
                  <div className="text-2xl font-semibold tabular-nums">{value}</div>
                </div>
                <span
                  aria-hidden
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    color: accent,
                    backgroundColor: `color-mix(in oklch, ${accent} 12%, transparent)`,
                  }}
                >
                  <Icon className="size-4" />
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">{t("dashboard.today.title")}</CardTitle>
          <CalendarDays className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {data.todaySessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("dashboard.today.empty")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {data.todaySessions.map((s) => (
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
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">{t("dashboard.overdue.title")}</CardTitle>
          <NotebookPen className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {data.overdueHomeworks.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("dashboard.overdue.empty")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.overdueHomeworks.map((h) => (
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
          {data.overdueHomeworks.length > 0 && (
            <Link to="/homework" className="mt-3 inline-block text-xs font-medium hover:underline">
              {t("dashboard.overdue.viewAll")}
            </Link>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">{t("dashboard.debtors.title")}</CardTitle>
          <TrendingDown className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {data.topDebtors.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("dashboard.debtors.empty")}</p>
          ) : (
            <div className="divide-y">
              {data.topDebtors.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="truncate text-sm font-medium">{d.name}</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-destructive" dir="ltr">
                    {formatMoney(d.remaining)}
                  </span>
                </div>
              ))}
              <Link to="/payments" className="inline-block pt-2 text-xs font-medium hover:underline">
                {t("dashboard.debtors.viewAll")}
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("dashboard.charts.attendance")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div dir="ltr" className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceChart} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="present" stackId="a" fill={ATTENDANCE_COLORS.present} name={t("attendance.statusPresent")} />
                  <Bar dataKey="late" stackId="a" fill={ATTENDANCE_COLORS.late} name={t("attendance.statusLate")} />
                  <Bar dataKey="absent" stackId="a" fill={ATTENDANCE_COLORS.absent} name={t("attendance.statusAbsent")} />
                  <Bar dataKey="excused" stackId="a" fill={ATTENDANCE_COLORS.excused} name={t("attendance.statusExcused")} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
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
            <div dir="ltr" className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={homeworkPie}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {homeworkPie.map((s) => (
                      <Cell key={s.key} fill={s.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {data.homeworkCount > 0 && (
              <ul className="space-y-1.5 text-sm">
                {homeworkPie.map((s) => (
                  <li key={s.key} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: s.fill }} />
                      {t(HOMEWORK_STATUS_KEYS[s.key as keyof typeof HOMEWORK_STATUS_KEYS])}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatNumber(s.value)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t("dashboard.charts.weakSkills")}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.weakSkills.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("dashboard.empty")}</p>
          ) : (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
              {data.weakSkills.map((s) => (
                <div key={s.name} className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm">{s.name}</span>
                    <span className="tabular-nums text-xs text-muted-foreground">{s.count}</span>
                  </div>
                  <div className="flex h-20 items-end gap-1">
                    <div
                      className="w-full rounded-t bg-warning"
                      style={{
                        height: `${Math.max(8, Math.min(100, (s.count / data.totalStudents) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-warning"
                      style={{ width: `${Math.min(100, (s.count / data.totalStudents) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
