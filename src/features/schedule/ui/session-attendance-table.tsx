import { memo, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { EmptyState } from "@/shared/EmptyState";
import { StatusPicker } from "@/shared/StatusPicker";
import { ATTENDANCE_STATUSES } from "@/features/attendance/domain";
import type { AttendanceStatus } from "@/features/attendance/domain";
import type { Student } from "@/lib/db/schema";

/** Memoized session member row: a status tap re-renders only this row. */
const SessionRow = memo(function SessionRow({
  student,
  status,
  onChange,
}: {
  student: Student;
  status?: AttendanceStatus;
  onChange: (studentId: string, status: AttendanceStatus) => void;
}) {
  const handleChange = useCallback((s: AttendanceStatus) => onChange(student.id, s), [onChange, student.id]);
  return (
    <tr className="border-b last:border-0 hover:bg-muted/50">
      <td className="px-2 py-2 font-medium">{student.name}</td>
      <td className="px-2 py-2">
        <StatusPicker value={status} onChange={handleChange} />
      </td>
    </tr>
  );
});

export function SessionStatusSummary({
  students,
  draft,
}: {
  students: Student[];
  draft: Record<string, AttendanceStatus>;
}) {
  const { t } = useTranslation();
  const statusCounts = useMemo(() => {
    const c: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const s of students) {
      const status = draft[s.id];
      if (status) c[status] += 1;
    }
    return c;
  }, [students, draft]);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="text-sm font-medium text-foreground">
        {t("attendance.summary.total")}: {students.length}
      </span>
      {ATTENDANCE_STATUSES.map((status) => (
        <span
          key={status}
          className={
            status === "present"
              ? "text-success"
              : status === "absent"
                ? "text-destructive"
                : status === "late"
                  ? "text-warning"
                  : "text-(--chart-5)"
          }
        >
          {t(`attendance.summary.${status}`)}: {statusCounts[status]}
        </span>
      ))}
    </div>
  );
}

export function SessionMemberTable({
  students,
  draft,
  onChange,
}: {
  students: Student[];
  draft: Record<string, AttendanceStatus>;
  onChange: (studentId: string, status: AttendanceStatus) => void;
}) {
  const { t } = useTranslation();
  if (students.length === 0) {
    return <EmptyState icon={Users} title={t("schedule.noMembers")} className="py-12" />;
  }
  return (
    <div className="max-h-96 overflow-y-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="px-2 py-2.5 text-start font-medium">
              {t("attendance.columns.student")}
            </th>
            <th className="px-2 py-2.5 text-start font-medium">
              {t("attendance.columns.status")}
            </th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <SessionRow key={s.id} student={s} status={draft[s.id]} onChange={onChange} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
