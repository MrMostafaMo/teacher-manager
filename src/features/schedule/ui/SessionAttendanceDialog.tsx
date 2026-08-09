import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { Check, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getSessionAttendance,
  saveSessionAttendance,
} from "@/features/schedule/application/schedule-cases";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import type { AttendanceStatus } from "@/features/attendance/domain";
import { ATTENDANCE_STATUSES } from "@/features/attendance/domain";
import type { Student } from "@/lib/db/schema";
import { formatTime } from "@/lib/utils/format";
import { useTimeStore } from "@/lib/time-store";
import { Modal } from "@/shared/Modal";
import { StatusPicker } from "@/shared/StatusPicker";
import { CardSkeleton } from "@/shared/Skeletons";
import { DatePicker } from "@/shared/DatePicker";
import { EmptyState } from "@/shared/EmptyState";
import { useSaveFeedback } from "@/shared/useSaveFeedback";
import { toast } from "@/lib/toast-store";

const inputClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring dark:bg-muted/50";

interface SessionAttendanceDialogProps {
  open: boolean;
  session: SessionWithGroup | null;
  onClose: () => void;
  onSaved: () => void;
}

export function SessionAttendanceDialog({
  open,
  session,
  onClose,
  onSaved,
}: SessionAttendanceDialogProps) {
  const { t } = useTranslation();
  const hour24 = useTimeStore((s) => s.hour24);
  const [date, setDate] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [students, setStudents] = useState<Student[]>([]);
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { saving, saved, run, clear } = useSaveFeedback();

  async function load(sessionId: string, groupId: string, date: string) {
    setLoading(true);
    setError("");
    try {
      const { students, rows } = await getSessionAttendance(
        { id: sessionId, groupId },
        date,
      );
      const byId = Object.fromEntries(rows.map((r) => [r.studentId, r.status])) as Record<
        string,
        AttendanceStatus
      >;
      setStudents(students);
      setDraft(Object.fromEntries(students.map((s) => [s.id, byId[s.id]])));
    } catch (e) {
      console.error("Failed to load session attendance", e);
      setError(t("schedule.errors.loadAttendance"));
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && session) {
      setDate(dayjs().format("YYYY-MM-DD"));
      clear();
      void load(session.id, session.groupId, dayjs().format("YYYY-MM-DD"));
    }
  }, [open, session]);

  useEffect(() => {
    if (open && session) void load(session.id, session.groupId, date);
  }, [date]);

  async function handleSave() {
    if (!session) return;
    // Only students with a chosen status are written — an untouched row stays
    // unrecorded instead of silently becoming "present".
    const entries = students.flatMap((s) => {
      const status = draft[s.id];
      return status ? [{ studentId: s.id, status }] : [];
    });
    if (entries.length === 0) return;
    try {
      await run(async () => {
        await saveSessionAttendance({ sessionId: session.id, date, entries });
        onSaved();
        await load(session.id, session.groupId, date);
        toast(t("schedule.attendanceSaved"));
      });
    } catch (e) {
      console.error("Failed to save session attendance", e);
      setError(t("schedule.errors.saveAttendance"));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={session ? `${session.groupName} — ${formatTime(session.startTime, hour24)} – ${formatTime(session.endTime, hour24)}` : ""}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            {t("schedule.attendanceDate")}
            <DatePicker
              value={date}
              onChange={(v) => v && setDate(v)}
              ariaLabel={t("schedule.attendanceDate")}
              className={inputClass}
            />
          </label>
          <Button onClick={() => void handleSave()} disabled={saving || loading || students.length === 0}>
            {saving ? t("schedule.saving") : t("schedule.saveAttendance")}
          </Button>
          {saved && (
            <Badge className="gap-1 bg-success/10 text-success">
              <Check className="size-3.5" />
              {t("schedule.attendanceSaved")}
            </Badge>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {students.length > 0 && (
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
                {t(`attendance.summary.${status}`)}:{" "}
                {students.filter((s) => draft[s.id] === status).length}
              </span>
            ))}
          </div>
        )}

        {loading ? (
          <div className="space-y-3 p-4">
            <CardSkeleton lines={3} />
          </div>
        ) : students.length === 0 ? (
          <EmptyState icon={Users} title={t("schedule.noMembers")} className="py-12" />
        ) : (
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
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-2 py-2 font-medium">{s.name}</td>
                    <td className="px-2 py-2">
                      <StatusPicker
                        value={draft[s.id]}
                        onChange={(status) => setDraft((d) => ({ ...d, [s.id]: status }))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t("schedule.cancel")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
