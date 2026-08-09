import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, formatNumber } from "@/lib/utils/format";
import { buildStudentTrends } from "@/features/student-profile/application/student-trends";
import type { StudentProfileData } from "@/features/student-profile/application/student-profile-cases";

const ATTENDANCE_COLORS = {
  present: "var(--chart-2)",
  late: "var(--chart-3)",
  absent: "var(--chart-4)",
  excused: "var(--chart-5)",
};

function TrendTooltip({ active, payload, label, format }: any) {
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
              {format ? format(p.value) : formatNumber(p.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-44">
        {children}
      </CardContent>
    </Card>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

export function StudentTrendsSection({ data }: { data: StudentProfileData }) {
  const { t } = useTranslation();
  const trends = useMemo(() => buildStudentTrends(data), [data]);

  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold">{t("profile.sections.trends")}</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TrendCard title={t("profile.trends.attendance")}>
          {trends.attendance.length === 0 ? (
            <EmptyState label={t("profile.trends.noData")} />
          ) : (
            <div dir="ltr" className="h-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends.attendance} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                  <Tooltip content={<TrendTooltip />} />
                  <Bar dataKey="present" stackId="a" fill={ATTENDANCE_COLORS.present} name={t("attendance.statusPresent")} />
                  <Bar dataKey="late" stackId="a" fill={ATTENDANCE_COLORS.late} name={t("attendance.statusLate")} />
                  <Bar dataKey="absent" stackId="a" fill={ATTENDANCE_COLORS.absent} name={t("attendance.statusAbsent")} />
                  <Bar dataKey="excused" stackId="a" fill={ATTENDANCE_COLORS.excused} name={t("attendance.statusExcused")} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </TrendCard>

        <TrendCard title={t("profile.trends.exams")}>
          {trends.exams.length === 0 ? (
            <EmptyState label={t("profile.trends.noData")} />
          ) : (
            <div dir="ltr" className="h-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends.exams} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} domain={[0, 100]} allowDecimals={false} />
                  <Tooltip content={<TrendTooltip format={(v: number) => `${formatNumber(v)}%`} />} />
                  <Line
                    type="monotone"
                    dataKey="pct"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name={t("profile.trends.examScore")}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </TrendCard>

        <TrendCard title={t("profile.trends.homework")}>
          {trends.homework.length === 0 ? (
            <EmptyState label={t("profile.trends.noData")} />
          ) : (
            <div dir="ltr" className="h-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends.homework} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} domain={[0, 100]} allowDecimals={false} />
                  <Tooltip content={<TrendTooltip format={(v: number) => `${formatNumber(v)}%`} />} />
                  <Bar dataKey="rate" fill="var(--chart-5)" radius={[3, 3, 0, 0]} name={t("profile.trends.homeworkDone")} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </TrendCard>

        <TrendCard title={t("profile.trends.payments")}>
          {trends.payments.length === 0 ? (
            <EmptyState label={t("profile.trends.noData")} />
          ) : (
            <div dir="ltr" className="h-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends.payments} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                  <Tooltip content={<TrendTooltip format={formatMoney} />} />
                  <Bar dataKey="amount" fill="var(--chart-2)" radius={[3, 3, 0, 0]} name={t("profile.trends.paymentsAmount")} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </TrendCard>
      </div>
    </section>
  );
}
