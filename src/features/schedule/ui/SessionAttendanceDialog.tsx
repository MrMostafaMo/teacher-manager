import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import {
  getSessionAttendance,
  saveSessionAttendance,
} from "@/features/schedule/application/schedule-cases";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import { Button } from "@/components/ui/button";
import type { AttendanceStatus } from "@/features/attendance/domain";
import type { Student } from "@/lib/db/schema";
import { formatTime } from "@/lib/utils/format";
import { useTimeStore } from "@/lib/time-store";
import { Modal } from "@/shared/Modal";
import { CardSkeleton } from "@/shared/Skeletons";
import { useSaveFeedback } from "@/shared/useSaveFeedback";
import { toast } from "@/lib/toast-store";
import { SessionMemberTable, SessionStatusSummary } from "./session-attendance-table";
import { SessionAttendanceToolbar } from "./session-attendance-toolbar";

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
  const { saving, saved, run, clear } = useSaveFeedback();

  async function load(sessionId: string, groupId: string, date: string) {
    setLoading(true);
    try {
      const { students, rows } = await getSessionAttendance({ id: sessionId, groupId }, date);
      const byId = Object.fromEntries(rows.map((r) => [r.studentId, r.status])) as Record<
        string,
        AttendanceStatus
      >;
      setStudents(students);
      setDraft(Object.fromEntries(students.map((s) => [s.id, byId[s.id]])));
    } catch (e) {
      console.error("Failed to load session attendance", e);
      toast(t("schedule.errors.loadAttendance"), "error");
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

  const handleChange = useCallback((studentId: string, status: AttendanceStatus) => {
    setDraft((d) => ({ ...d, [studentId]: status }));
  }, []);

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
      toast(t("schedule.errors.saveAttendance"), "error");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        session
          ? `${session.groupName} — ${formatTime(session.startTime, hour24)} – ${formatTime(session.endTime, hour24)}`
          : ""
      }
    >
      <div className="space-y-4">
        <SessionAttendanceToolbar
          date={date}
          onDateChange={setDate}
          onSave={() => void handleSave()}
          saving={saving}
          disabled={loading || students.length === 0}
          saved={saved}
        />

        

        {students.length > 0 && <SessionStatusSummary students={students} draft={draft} />}

        {loading ? (
          <div className="space-y-3 p-4">
            <CardSkeleton lines={3} />
          </div>
        ) : (
          <SessionMemberTable students={students} draft={draft} onChange={handleChange} />
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
