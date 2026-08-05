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
import type { Student } from "@/lib/db/schema";
import { Modal } from "@/features/students/ui/Modal";
import { StatusPicker } from "@/shared/StatusPicker";

const inputClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring";

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
  const [date, setDate] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [students, setStudents] = useState<Student[]>([]);
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
      setDraft(Object.fromEntries(students.map((s) => [s.id, byId[s.id] ?? "present"])));
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
      setSaved(false);
      void load(session.id, session.groupId, dayjs().format("YYYY-MM-DD"));
    }
  }, [open, session]);

  useEffect(() => {
    if (open && session) void load(session.id, session.groupId, date);
  }, [date]);

  async function handleSave() {
    if (!session) return;
    const entries = students.map((s) => ({ studentId: s.id, status: draft[s.id] ?? "present" }));
    if (entries.length === 0) return;
    setSaving(true);
    setError("");
    try {
      await saveSessionAttendance({ sessionId: session.id, date, entries });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onSaved();
      await load(session.id, session.groupId, date);
    } catch (e) {
      console.error("Failed to save session attendance", e);
      setError(t("schedule.errors.saveAttendance"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={session ? `${session.groupName} — ${session.startTime} – ${session.endTime}` : ""}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            {t("schedule.attendanceDate")}
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className={inputClass}
            />
          </label>
          <Button onClick={() => void handleSave()} disabled={saving || loading || students.length === 0}>
            {saving ? t("schedule.saving") : t("schedule.saveAttendance")}
          </Button>
          {saved && (
            <Badge className="gap-1 bg-emerald-600/10 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              <Check className="size-3.5" />
              {t("schedule.attendanceSaved")}
            </Badge>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {t("schedule.loading")}
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
              <Users className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">{t("schedule.noMembers")}</p>
          </div>
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
                        value={draft[s.id] ?? "present"}
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
