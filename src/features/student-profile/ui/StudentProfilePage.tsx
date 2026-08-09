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
  Pencil,
  Phone,
  ReceiptText,
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
import { Avatar } from "@/shared/Avatar";
import {
  getStudentProfile,
  type StudentProfileData,
  type ProfileHomework,
  type ProfileExam,
  type ProfileSessionAttendance,
} from "@/features/student-profile/application/student-profile-cases";
import type { PaymentHistoryRow } from "@/features/payments/application/payment-cases";
import type { Attendance } from "@/lib/db/schema";
import { StatusBadge } from "@/features/students/ui/StatusBadge";
import { StudentFormDialog } from "@/features/students/ui/StudentFormDialog";
import { StudentSkillsDialog } from "@/features/skills/ui/StudentSkillsDialog";
import { StudentStatementDialog } from "@/features/student-profile/ui/StudentStatementDialog";
import { isOverdue } from "@/features/homework/application/homework-cases";
import { ACTION_KEYS } from "@/features/activity/ui/ActivityPage";
import { PageHeader } from "@/shared/PageHeader";
import { DataTable } from "@/shared/DataTable";
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
  const [editOpen, setEditOpen] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);
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
            <Skeleton className="size-9 shrink-0 rounded-full" />
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
      <div className="space-y-3">
        <Link
          to="/students"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="size-4 rtl:rotate-180" />
          {t("profile.back")}
        </Link>

        <PageHeader
          title={student.name}
          description={
            student.enrolledOn
              ? `${t("students.registered")} ${formatDateString(student.enrolledOn)}`
              : undefined
          }
          actions={
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" />
                {t("students.edit")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setStatementOpen(true)}>
                <ReceiptText className="size-4" />
                {t("profile.statement.open")}
              </Button>
              <Avatar name={student.name} className="size-9 text-xs" />
              <StatusBadge status={student.status} />
            </div>
          }
        />
      </div>

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
            <CardContent className="p-0">
              <DataTable<Attendance>
                columns={[
                  {
                    header: t("profile.columns.date"),
                    className: "text-muted-foreground tabular-nums",
                    render: (r) => <span dir="ltr">{formatDateString(r.date)}</span>,
                  },
                  {
                    header: t("profile.columns.status"),
                    render: (r) => (
                      <Badge className={STATUS_BADGE[r.status]}>{t(STATUS_LABEL[r.status])}</Badge>
                    ),
                  },
                ]}
                rows={attendanceHistory}
                getRowKey={(r) => r.id}
              />
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
            <CardContent className="p-0">
              <DataTable<PaymentHistoryRow>
                columns={[
                  {
                    header: t("profile.columns.date"),
                    className: "text-muted-foreground tabular-nums",
                    render: ({ payment }) => <span dir="ltr">{formatDate(payment.paidAt)}</span>,
                  },
                  {
                    header: t("profile.columns.period"),
                    className: "text-muted-foreground",
                    render: ({ payment }) => <span dir="ltr">{payment.period ?? "—"}</span>,
                  },
                  {
                    header: t("profile.columns.amount"),
                    className: "font-medium tabular-nums",
                    render: ({ payment }) => <span dir="ltr">{formatMoney(payment.amount)}</span>,
                  },
                  {
                    header: t("profile.columns.method"),
                    render: ({ payment }) => (
                      <Badge variant="secondary">
                        {t(PAYMENT_METHOD_LABEL[payment.method] ?? "payments.cash")}
                      </Badge>
                    ),
                  },
                ]}
                rows={payments}
                getRowKey={({ payment }) => payment.id}
              />
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
            <CardContent className="p-0">
              <DataTable<ProfileHomework>
                columns={[
                  {
                    header: t("profile.columns.title"),
                    className: "font-medium",
                    render: (h) => h.title,
                  },
                  {
                    header: t("profile.columns.group"),
                    className: "text-muted-foreground",
                    render: (h) => h.groupName ?? "—",
                  },
                  {
                    header: t("profile.columns.dueDate"),
                    className: "text-muted-foreground tabular-nums",
                    render: (h) => (
                      <span dir="ltr">{h.dueDate ? formatDateString(h.dueDate) : "—"}</span>
                    ),
                  },
                  {
                    header: t("profile.columns.status"),
                    render: (h) => {
                      const overdue = isOverdue({
                        dueDate: h.dueDate,
                        pending: h.status === "pending" ? 1 : 0,
                      });
                      return (
                        <Badge
                          className={
                            overdue ? "bg-destructive/10 text-destructive" : SUBMISSION_BADGE[h.status]
                          }
                        >
                          {overdue ? t("homework.statusOverdue") : t(SUBMISSION_LABEL[h.status])}
                        </Badge>
                      );
                    },
                  },
                ]}
                rows={homeworks}
                getRowKey={(h) => h.id}
              />
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
            <CardContent className="p-0">
              <DataTable<ProfileExam>
                columns={[
                  {
                    header: t("profile.columns.title"),
                    className: "font-medium",
                    render: (e) => e.title,
                  },
                  {
                    header: t("profile.columns.group"),
                    className: "text-muted-foreground",
                    render: (e) => e.groupName ?? "—",
                  },
                  {
                    header: t("profile.columns.date"),
                    className: "text-muted-foreground tabular-nums",
                    render: (e) => (
                      <span dir="ltr">{e.date ? formatDateString(e.date) : "—"}</span>
                    ),
                  },
                  {
                    header: t("profile.columns.score"),
                    className: "font-medium tabular-nums",
                    render: (e) => (
                      <span dir="ltr">
                        {e.score === null ? t("exams.ungraded") : `${e.score} / ${e.maxScore}`}
                      </span>
                    ),
                  },
                ]}
                rows={exams}
                getRowKey={(e) => e.id}
              />
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
            <CardContent className="p-0">
              <DataTable<ProfileSessionAttendance>
                columns={[
                  {
                    header: t("profile.columns.date"),
                    className: "text-muted-foreground tabular-nums",
                    render: (r) => <span dir="ltr">{formatDateString(r.date)}</span>,
                  },
                  {
                    header: t("profile.columns.day"),
                    className: "text-muted-foreground",
                    render: (r) => t(`schedule.days.${DAY_KEYS[r.dayOfWeek] ?? "sun"}`),
                  },
                  {
                    header: t("profile.columns.time"),
                    className: "text-muted-foreground tabular-nums",
                    render: (r) => (
                      <span dir="ltr">
                        {formatTime(r.startTime, hour24)} – {formatTime(r.endTime, hour24)}
                      </span>
                    ),
                  },
                  {
                    header: t("profile.columns.group"),
                    className: "text-muted-foreground",
                    render: (r) => r.groupName,
                  },
                  {
                    header: t("profile.columns.status"),
                    render: (r) => (
                      <Badge className={STATUS_BADGE[r.status]}>{t(STATUS_LABEL[r.status])}</Badge>
                    ),
                  },
                ]}
                rows={sessionAttendance}
                getRowKey={(r) => r.id}
              />
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
              <CardContent className="p-0">
                <DataTable<{ id: string; action: string; createdAt: number }>
                  columns={[
                    {
                      header: t("profile.columns.time"),
                      className: "text-muted-foreground tabular-nums",
                      render: (row) => <span dir="ltr">{formatDateTime(row.createdAt, hour24)}</span>,
                    },
                    {
                      header: t("profile.columns.action"),
                      render: (row) =>
                        t(`activity.actions.${ACTION_KEYS[row.action] ?? "unknown"}`),
                    },
                  ]}
                  rows={activity.slice(0, 10)}
                  getRowKey={(row) => row.id}
                />
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

      <StudentFormDialog
        open={editOpen}
        student={student}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false);
          setReloadKey((k) => k + 1);
        }}
      />

      <StudentStatementDialog
        open={statementOpen}
        studentId={student.id}
        studentName={student.name}
        onClose={() => setStatementOpen(false)}
      />
    </div>
  );
}
