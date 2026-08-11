import { memo, useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { buildStudentTrends } from "@/features/student-profile/application/student-trends";
import type { StudentProfileData } from "@/features/student-profile/application/student-profile-cases";
import { useInView } from "@/shared/useInView";
import { AttendanceBars, ExamLine, HomeworkBars, PaymentBars } from "./student-trend-charts";

function TrendCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-44">{children}</CardContent>
    </Card>
  );
}

function TrendEmpty({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

const TrendChart = memo(function TrendChart({
  empty,
  label,
  children,
}: {
  empty: boolean;
  label: string;
  children: ReactNode;
}) {
  if (empty) return <TrendEmpty label={label} />;
  return (
    <div dir="ltr" className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
});

export function StudentTrendsSection({ data }: { data: StudentProfileData }) {
  const { t } = useTranslation();
  const trends = useMemo(() => buildStudentTrends(data), [data]);
  const { ref, inView } = useInView<HTMLDivElement>();

  const charts: ReactNode[] = [
    <TrendChart empty={trends.attendance.length === 0} label={t("profile.trends.noData")} key="a">
      <AttendanceBars data={trends.attendance} />
    </TrendChart>,
    <TrendChart empty={trends.exams.length === 0} label={t("profile.trends.noData")} key="e">
      <ExamLine data={trends.exams} />
    </TrendChart>,
    <TrendChart empty={trends.homework.length === 0} label={t("profile.trends.noData")} key="h">
      <HomeworkBars data={trends.homework} />
    </TrendChart>,
    <TrendChart empty={trends.payments.length === 0} label={t("profile.trends.noData")} key="p">
      <PaymentBars data={trends.payments} />
    </TrendChart>,
  ];

  const titles = [
    t("profile.trends.attendance"),
    t("profile.trends.exams"),
    t("profile.trends.homework"),
    t("profile.trends.payments"),
  ];

  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold">{t("profile.sections.trends")}</h3>
      <div ref={ref} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {inView
          ? charts.map((chart, i) => (
              <TrendCard title={titles[i]} key={i}>
                {chart}
              </TrendCard>
            ))
          : titles.map((title, i) => (
              <TrendCard title={title} key={i}>
                <Skeleton className="h-full w-full" />
              </TrendCard>
            ))}
      </div>
    </section>
  );
}
