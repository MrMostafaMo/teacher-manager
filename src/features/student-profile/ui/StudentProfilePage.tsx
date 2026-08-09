import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BookMarked,
  CalendarCheck,
  ClipboardList,
  GraduationCap,
  Layers,
  Phone,
  Sparkles,
  StickyNote,
  User,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeleton } from "@/shared/Skeletons";
import {
  getStudentProfile,
  type StudentProfileData,
} from "@/features/student-profile/application/student-profile-cases";
import { StatusBadge } from "@/features/students/ui/StatusBadge";
import { StudentSkillsDialog } from "@/features/skills/ui/StudentSkillsDialog";
import { isOverdue } from "@/features/homework/application/homework-cases";
import { ACTION_KEYS } from "@/features/activity/ui/ActivityPage";
import { useTimeStore } from "@/lib/time-store";
import { formatDate, formatDateString, formatDateTime, formatMoney, formatTime } from "@/lib/utils/format";
import { ATTENDANCE_STATUSES, type AttendanceStatus } from "@/features/attendance/domain";
import type { SubmissionStatus } from "@/features/homework/domain";

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "attendance.statusPresent",
  absent: "attendance.statusAbsent",
  late: "attendance.statusLate",
  excused: "attendance.statusExcused",
};

const STATUS_BADGE: Record<AttendanceStatus, string> = {
  present: "bg-success/10 text-success",
  absent: "bg-destructive/10 text-destructive",
  late: "bg-warning/10 text-warning",
  excused: "bg-(--chart-5)/10 text-(--chart-5)",
};

const SUBMISSION_BADGE: Record<SubmissionStatus, string> = {
  submitted: "bg-success/10 text-success",
  late: "bg-warning/10 text-warning",
  pending: "bg-muted text-muted-foreground",
};

const SUBMISSION_LABEL: Record<SubmissionStatus, string> = {
  submitted: "homework.statusSubmitted",
  late: "homework.statusLate",
  pending: "homework.statusPending",
};

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: "payments.cash",
  card: "payments.card",
  transfer: "payments.transfer",
};

export default function StudentProfilePage() {
  const { id = "" } = useParams();
  const { t } = useTranslation();
  const hour24 = useTimeStore((s) => s.hour24);
  const [data, setData] = useState<StudentProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError("");
    getStudentProfile(id)
      .then(setData)
      .catch((e) => {
        console.error("Failed to load student profile", e);
        setError(t("profile.loadError"));
      })
      .finally(() => setLoading(false));
  }, [id, reloadKey, t]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <Skeleton className="size-20 shrink-0 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <CardSkeleton lines={2} />
          <CardSkeleton lines={2} />
          <CardSkeleton lines={2} />
          <CardSkeleton lines={2} />
        </div>
        <CardSkeleton lines={4} />
      </div>
    );
  }
  if (error || !data) {
    return <p className="py-16 text-center text-destructive">{error || t("profile.notFound")}</p>;
  }

  const {
    student,
    planName,
    groups,
    attendanceStats,
    attendanceHistory,
    payments,
    homeworks,
    exams,
    sessionAttendance,
    skills,
    activity,
  } = data;

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

  const stats = [
    { key: "profile.stats.attendanceRate", value: attendanceRate === null ? "—" : `${attendanceRate}%`, icon: CalendarCheck },
    { key: "profile.stats.homeworkCompletion", value: homeworkRate === null ? "—" : `${homeworkRate}%`, icon: ClipboardList },
    { key: "profile.stats.examAverage", value: examAverage === null ? "—" : String(examAverage), icon: GraduationCap },
    { key: "profile.stats.sessionsAttended", value: String(sessionAttendance.length), icon: Layers },
  ];

  const nameWords = student.name.trim().split(/\s+/).filter(Boolean);
  const initials =
    nameWords.length > 1
      ? `${Array.from(nameWords[0])[0] ?? ""}${Array.from(nameWords[1])[0] ?? ""}`
      : (Array.from(nameWords[0] ?? "").slice(0, 2).join("") || "؟");

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
    <div className="space-y-6">
      <Link
        to="/students"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="size-4 rtl:rotate-180" />
        {t("profile.back")}
      </Link>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-4 border-b p-5">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">{student.name}</h2>
              <StatusBadge status={student.status} />
            </div>
            {student.enrolledOn ? (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t("students.registered")} {formatDateString(student.enrolledOn)}
              </p>
            ) : null}
          </div>
        </div>
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

      <Separator />

      <section className="space-y-3">
        <h3 className="text-base font-semibold">{t("profile.sections.attendance")}</h3>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          {ATTENDANCE_STATUSES.map((status) => (
            <Badge key={status} className={STATUS_BADGE[status]}>
              {t(STATUS_LABEL[status])}: {attendanceStats[status]}
            </Badge>
          ))}
          {attendanceRate !== null && (
            <Badge variant="outline">
              {t("profile.stats.attendanceRate")}: {attendanceRate}%
            </Badge>
          )}
        </div>
        {attendanceHistory.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t("profile.empty.attendance")}</p>
        ) : (
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-start font-medium">{t("profile.columns.date")}</th>
                    <th className="px-4 py-2.5 text-start font-medium">{t("profile.columns.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceHistory.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-2.5 text-muted-foreground" dir="ltr">
                        {formatDateString(r.date)}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge className={STATUS_BADGE[r.status]}>{t(STATUS_LABEL[r.status])}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </section>

      <Separator />

      <section className="space-y-3">
        <h3 className="text-base font-semibold">{t("profile.sections.payments")}</h3>
        {payments.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t("profile.empty.payments")}</p>
        ) : (
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-start font-medium">{t("profile.columns.date")}</th>
                    <th className="px-4 py-2.5 text-start font-medium">{t("profile.columns.period")}</th>
                    <th className="px-4 py-2.5 text-start font-medium">{t("profile.columns.amount")}</th>
                    <th className="px-4 py-2.5 text-start font-medium">{t("profile.columns.method")}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(({ payment }) => (
                    <tr key={payment.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-2.5 text-muted-foreground" dir="ltr">
                        {formatDate(payment.paidAt)}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground" dir="ltr">
                        {payment.period ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 font-medium tabular-nums" dir="ltr">
                        {formatMoney(payment.amount)}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="secondary">
                          {t(PAYMENT_METHOD_LABEL[payment.method] ?? "payments.cash")}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </section>

      <Separator />

      <section className="space-y-3">
        <h3 className="text-base font-semibold">{t("profile.sections.homework")}</h3>
        {homeworks.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t("profile.empty.homework")}</p>
        ) : (
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-start font-medium">{t("profile.columns.title")}</th>
                    <th className="px-4 py-2.5 text-start font-medium">{t("profile.columns.group")}</th>
                    <th className="px-4 py-2.5 text-start font-medium">{t("profile.columns.dueDate")}</th>
                    <th className="px-4 py-2.5 text-start font-medium">{t("profile.columns.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {homeworks.map((h) => {
                    const overdue = isOverdue({ dueDate: h.dueDate, pending: h.status === "pending" ? 1 : 0 });
                    return (
                      <tr key={h.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="px-4 py-2.5 font-medium">{h.title}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{h.groupName ?? "—"}</td>
                        <td className="px-4 py-2.5 text-muted-foreground" dir="ltr">
                          {h.dueDate ? formatDateString(h.dueDate) : "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge className={overdue ? "bg-destructive/10 text-destructive" : SUBMISSION_BADGE[h.status]}>
                            {overdue ? t("homework.statusOverdue") : t(SUBMISSION_LABEL[h.status])}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </section>

      <Separator />

      <section className="space-y-3">
        <h3 className="text-base font-semibold">{t("profile.sections.exams")}</h3>
        {exams.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t("profile.empty.exams")}</p>
        ) : (
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-start font-medium">{t("profile.columns.title")}</th>
                    <th className="px-4 py-2.5 text-start font-medium">{t("profile.columns.group")}</th>
                    <th className="px-4 py-2.5 text-start font-medium">{t("profile.columns.date")}</th>
                    <th className="px-4 py-2.5 text-start font-medium">{t("profile.columns.score")}</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((e) => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-2.5 font-medium">{e.title}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{e.groupName ?? "—"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground" dir="ltr">
                        {e.date ? formatDateString(e.date) : "—"}
                      </td>
                      <td className="px-4 py-2.5 font-medium tabular-nums" dir="ltr">
                        {e.score === null ? t("exams.ungraded") : `${e.score} / ${e.maxScore}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </section>

      <Separator />

      <section className="space-y-3">
        <h3 className="text-base font-semibold">{t("profile.sections.sessions")}</h3>
        {sessionAttendance.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t("profile.empty.sessions")}</p>
        ) : (
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-start font-medium">{t("profile.columns.date")}</th>
                    <th className="px-4 py-2.5 text-start font-medium">{t("profile.columns.day")}</th>
                    <th className="px-4 py-2.5 text-start font-medium">{t("profile.columns.time")}</th>
                    <th className="px-4 py-2.5 text-start font-medium">{t("profile.columns.group")}</th>
                    <th className="px-4 py-2.5 text-start font-medium">{t("profile.columns.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionAttendance.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-2.5 text-muted-foreground" dir="ltr">
                        {formatDateString(r.date)}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {t(`schedule.days.${DAY_KEYS[r.dayOfWeek] ?? "sun"}`)}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground" dir="ltr">
                        {formatTime(r.startTime, hour24)} – {formatTime(r.endTime, hour24)}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{r.groupName}</td>
                      <td className="px-4 py-2.5">
                        <Badge className={STATUS_BADGE[r.status]}>{t(STATUS_LABEL[r.status])}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </section>

      <Separator />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold">{t("profile.sections.skills")}</h3>
          <Button size="sm" variant="outline" onClick={() => setSkillsOpen(true)}>
            <Sparkles className="size-4" />
            {t("profile.manageSkills")}
          </Button>
        </div>
        {skills.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t("profile.empty.skills")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <Badge key={s.skillId} variant={s.weak ? "destructive" : "secondary"} className="px-3 py-1">
                {s.name}
                {s.level !== null ? ` · ${t(`skills.levels.${s.level}`)}` : ""}
              </Badge>
            ))}
          </div>
        )}
      </section>

      {activity.length > 0 && (
        <>
          <Separator />
          <section className="space-y-3">
            <h3 className="text-base font-semibold">{t("profile.sections.activity")}</h3>
            <Card>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="px-4 py-2.5 text-start font-medium">{t("profile.columns.time")}</th>
                      <th className="px-4 py-2.5 text-start font-medium">{t("profile.columns.action")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.slice(0, 10).map((row) => (
                      <tr key={row.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="px-4 py-2.5 text-muted-foreground" dir="ltr">
                          {formatDateTime(row.createdAt, hour24)}
                        </td>
                        <td className="px-4 py-2.5">
                          {t(`activity.actions.${ACTION_KEYS[row.action] ?? "unknown"}`)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </section>
        </>
      )}

      <StudentSkillsDialog
        open={skillsOpen}
        studentId={student.id}
        studentName={student.name}
        onClose={() => setSkillsOpen(false)}
        onChanged={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}
