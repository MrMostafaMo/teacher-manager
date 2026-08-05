import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardData, type DashboardData } from "@/features/dashboard/application/dashboard-cases";

type ChartStatus = "loading" | "ready" | "error";

const ATTENDANCE_COLORS = { present: "#10b981", late: "#f59e0b", absent: "#f43f5e" };
const HOMEWORK_COLORS = { submitted: "#10b981", pending: "#94a3b8", late: "#f59e0b" };
const HOMEWORK_STATUS_KEYS = {
  submitted: "homework.statusSubmitted",
  pending: "homework.statusPending",
  late: "homework.statusLate",
} as const;

function monthShort(iso: string): string {
  const [y, m] = iso.split("-");
  return `${m}/${y.slice(2)}`;
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ChartStatus>("loading");
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const d = await getDashboardData();
        if (!cancelled) setData(d);
      } catch (error) {
        console.error("Dashboard load failed", error);
        if (!cancelled) setStatus("error");
      } finally {
        if (!cancelled) setStatus("ready");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status !== "ready" || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          {status === "error" ? t("dashboard.loadError") : t("common.loading")}
        </CardContent>
      </Card>
    );
  }

  const attendanceChart = data.attendanceTrend.map((r) => ({
    month: monthShort(r.month),
    present: r.present,
    late: r.late,
    absent: r.absent,
  }));

  const homeworkPie = [
    { key: "submitted", value: data.homeworkSubmitted, fill: HOMEWORK_COLORS.submitted },
    { key: "pending", value: data.homeworkPending, fill: HOMEWORK_COLORS.pending },
    { key: "late", value: data.homeworkLate, fill: HOMEWORK_COLORS.late },
  ];

  const kpis = [
    { key: "totalStudents", value: data.totalStudents, icon: Users },
    { key: "activeStudents", value: data.activeStudents, icon: UserCheck },
    { key: "attendanceRate", value: `${data.attendanceRate}%`, icon: CalendarCheck },
    { key: "collected", value: data.collected.toLocaleString("ar-EG"), icon: Wallet },
    { key: "homeworkCompletion", value: `${data.homeworkCompletion}%`, icon: ClipboardList },
    { key: "examAverage", value: data.examAverage === null ? "—" : String(data.examAverage), icon: GraduationCap },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">{t("dashboard.welcome")}</h2>
        <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map(({ key, value, icon: Icon }) => (
          <Card key={key}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between gap-2 text-muted-foreground">
                <span className="text-xs">{t(`dashboard.kpis.${key}`)}</span>
                <Icon className="size-4" />
              </div>
              <div className="text-2xl font-semibold tabular-nums">{value}</div>
            </CardContent>
          </Card>
        ))}
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
                <div key={s.id} className="rounded-lg border bg-muted/40 p-3">
                  <p className="truncate text-sm font-medium">{s.groupName}</p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {s.startTime} – {s.endTime}
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
                      {h.dueDate}
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("dashboard.charts.attendance")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div dir="ltr" className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceChart} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="present" stackId="a" fill={ATTENDANCE_COLORS.present} name={t("attendance.statusPresent")} />
                  <Bar dataKey="late" stackId="a" fill={ATTENDANCE_COLORS.late} name={t("attendance.statusLate")} />
                  <Bar dataKey="absent" stackId="a" fill={ATTENDANCE_COLORS.absent} name={t("attendance.statusAbsent")} />
                </BarChart>
              </ResponsiveContainer>
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
                    nameKey="key"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {homeworkPie.map((s) => (
                      <Cell key={s.key} fill={s.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => Number(value ?? 0).toLocaleString("ar-EG")} />
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
                      {s.value.toLocaleString("ar-EG")}
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
                      className="w-full rounded-t bg-rose-500"
                      style={{
                        height: `${Math.max(8, Math.min(100, (s.count / data.totalStudents) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-rose-500"
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
