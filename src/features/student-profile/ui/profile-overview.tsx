import { useTranslation } from "react-i18next";
import {
  BookMarked,
  CalendarCheck,
  ClipboardList,
  GraduationCap,
  Layers,
  Phone,
  StickyNote,
  User,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Student } from "@/lib/db/schema";
import type { StudentProfileData } from "@/features/student-profile/application/student-profile-cases";

/** Attendance rate, exam average and homework completion for the header KPIs. */
export function useProfileSummary(data: StudentProfileData) {
  const { attendanceStats, exams, homeworks } = data;
  const marked =
    attendanceStats.present + attendanceStats.absent + attendanceStats.late + attendanceStats.excused;
  const attended = attendanceStats.present + attendanceStats.late + attendanceStats.excused;
  const attendanceRate = marked > 0 ? Math.round((attended / marked) * 100) : null;

  const gradedExams = exams.filter((e) => e.score !== null);
  const examAverage =
    gradedExams.length > 0
      ? Math.round((gradedExams.reduce((a, e) => a + (e.score ?? 0), 0) / gradedExams.length) * 10) / 10
      : null;

  const homeworkDone = homeworks.filter((h) => h.status !== "pending").length;
  const homeworkRate = homeworks.length > 0 ? Math.round((homeworkDone / homeworks.length) * 100) : null;
  return { attendanceRate, examAverage, homeworkRate };
}

export function ProfileFactsCard({
  student,
  planName,
  groups,
}: {
  student: Student;
  planName: string | null;
  groups: Array<{ id: string; name: string }>;
}) {
  const { t } = useTranslation();
  const facts = [
    { key: "profile.plan", value: planName ?? t("students.noPlan"), icon: BookMarked, ltr: false },
    {
      key: "profile.groups",
      value: groups.length > 0 ? groups.map((g) => g.name).join("، ") : t("students.ungrouped"),
      icon: Users,
      ltr: false,
    },
    {
      key: "profile.guardian",
      value: student.guardianName
        ? student.guardianPhone
          ? `${student.guardianName} · ${student.guardianPhone}`
          : student.guardianName
        : (student.guardianPhone ?? "—"),
      icon: User,
      ltr: false,
    },
    { key: "profile.phone", value: student.phone ?? "—", icon: Phone, ltr: Boolean(student.phone) },
  ] as const;

  return (
    <Card className="overflow-hidden">
      <CardContent className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
        {facts.map(({ key, value, icon: Icon, ltr }) => (
          <div key={key} className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Icon className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t(key)}</p>
              <p className="text-sm font-medium" dir={ltr ? "ltr" : undefined}>
                {value}
              </p>
            </div>
          </div>
        ))}
        {student.notes ? (
          <div className="flex items-start gap-3 sm:col-span-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <StickyNote className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t("profile.notes")}</p>
              <p className="whitespace-pre-wrap text-sm">{student.notes}</p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ProfileStatsGrid({
  attendanceRate,
  homeworkRate,
  examAverage,
  sessionCount,
}: {
  attendanceRate: number | null;
  homeworkRate: number | null;
  examAverage: number | null;
  sessionCount: number;
}) {
  const { t } = useTranslation();
  const stats = [
    {
      key: "profile.stats.attendanceRate",
      value: attendanceRate === null ? "—" : `${attendanceRate}%`,
      icon: CalendarCheck,
    },
    {
      key: "profile.stats.homeworkCompletion",
      value: homeworkRate === null ? "—" : `${homeworkRate}%`,
      icon: ClipboardList,
    },
    { key: "profile.stats.examAverage", value: examAverage === null ? "—" : String(examAverage), icon: GraduationCap },
    { key: "profile.stats.sessionsAttended", value: String(sessionCount), icon: Layers },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {stats.map(({ key, value, icon: Icon }) => (
        <Card key={key}>
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center justify-between gap-2 text-muted-foreground">
              <span className="text-xs">{t(key)}</span>
              <Icon className="size-4" />
            </div>
            <div className="text-2xl font-semibold tabular-nums">{value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
