import { memo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { AttendanceStatus } from "@/features/attendance/domain";
import type { Student } from "@/lib/db/schema";
import { StatusPicker } from "@/shared/StatusPicker";

/**
 * Memoized roster row: a status tap re-renders only this row (stable `onChange`
 * + `StatusPicker` memo) instead of the whole table.
 */
const RosterRow = memo(function RosterRow({
  student,
  groupLabel,
  status,
  onChange,
}: {
  student: Student;
  groupLabel: string;
  status?: AttendanceStatus;
  onChange: (studentId: string, status: AttendanceStatus) => void;
}) {
  const handleChange = useCallback(
    (s: AttendanceStatus) => onChange(student.id, s),
    [onChange, student.id],
  );
  return (
    <tr className="border-b last:border-0 hover:bg-muted/50">
      <td className="px-4 py-2.5">
        <p className="font-medium">{student.name}</p>
        <p className="text-xs text-muted-foreground">{groupLabel}</p>
      </td>
      <td className="px-4 py-2.5">
        <StatusPicker value={status} onChange={handleChange} />
      </td>
    </tr>
  );
});

export const RosterTable = memo(function RosterTable({
  list,
  groupLabel,
  draft,
  onChange,
}: {
  list: Student[];
  groupLabel: string;
  draft: Record<string, AttendanceStatus | undefined>;
  onChange: (studentId: string, status: AttendanceStatus) => void;
}) {
  const { t } = useTranslation();
  return (
    <div tabIndex={0} role="region" aria-label="جدول الحضور" className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [scrollbar-width:thin]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-xs text-muted-foreground align-middle">
            <th className="px-4 py-2.5 text-start font-medium">
              {t("attendance.columns.student")}
            </th>
            <th className="px-4 py-2.5 text-start font-medium">{t("attendance.columns.status")}</th>
          </tr>
        </thead>
        <tbody>
          {list.map((s) => (
            <RosterRow
              key={s.id}
              student={s}
              groupLabel={groupLabel}
              status={draft[s.id]}
              onChange={onChange}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
});
