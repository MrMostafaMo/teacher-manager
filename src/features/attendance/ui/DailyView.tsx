import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import {
  getDaily,
  saveDaily,
} from "@/features/attendance/application/attendance-cases";
import { listGroups } from "@/features/groups/application/group-cases";
import type { GroupWithCount } from "@/features/groups/infrastructure/group-repo";
import type { AttendanceStatus } from "@/features/attendance/domain";
import type { Student } from "@/lib/db/schema";
import { useSaveFeedback } from "@/shared/useSaveFeedback";
import { toast } from "@/lib/toast-store";
import { useMemberships, buildSections } from "./attendance-sections";
import { SummaryCards } from "./SummaryCards";
import { DailyRosterCard } from "./DailyRosterCard";
import { DailyToolbar } from "./daily-toolbar";

export function DailyView({ date, onDateChange }: { date: string; onDateChange: (d: string) => void }) {
  const { t } = useTranslation();
  const [students, setStudents] = useState<Student[]>([]);
  const [draft, setDraft] = useState<Record<string, AttendanceStatus | undefined>>({});
  const [savedStatuses, setSavedStatuses] = useState<Record<string, AttendanceStatus | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { saving, saved, run } = useSaveFeedback();
  const [groups, setGroups] = useState<GroupWithCount[]>([]);
  const [groupId, setGroupId] = useState("");
  const [hasSessionsToday, setHasSessionsToday] = useState(true);
  const groupsByStudent = useMemberships();
  const isFuture = date > dayjs().format("YYYY-MM-DD");

  useEffect(() => {
    void listGroups()
      .then(setGroups)
      .catch(() => setGroups([]));
  }, []);

  async function load(date: string, groupId: string) {
    setLoading(true);
    setError("");
    try {
      const { students, rows, hasSessionsToday, defaults } = await getDaily(date, groupId || undefined);
      const byId = Object.fromEntries(rows.map((r) => [r.studentId, r.status])) as Record<string, AttendanceStatus>;
      setHasSessionsToday(hasSessionsToday);
      setStudents(students);
      setSavedStatuses(byId);
      setDraft(Object.fromEntries(students.map((s) => [s.id, byId[s.id] ?? defaults[s.id]])));
    } catch (e) {
      console.error("Failed to load attendance", e);
      setError(t("attendance.errors.load"));
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(date, groupId);
  }, [date, groupId]);

  const counts = useMemo(() => {
    const c: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const s of students) {
      const status = draft[s.id];
      if (status) c[status] += 1;
    }
    return c;
  }, [students, draft]);

  const marked = counts.present + counts.absent + counts.late + counts.excused;

  const dirty = students.some((s) => draft[s.id] !== savedStatuses[s.id]);

  const handleRosterChange = useCallback((studentId: string, status: AttendanceStatus) => {
    setDraft((d) => ({ ...d, [studentId]: status }));
  }, []);

  const { sections, ungrouped } = useMemo(
    () => buildSections(students, groupsByStudent, (s) => s.id),
    [students, groupsByStudent],
  );

  async function handleSave() {
    // Persist one row per student with an explicit status; unmarked students
    // (future days / sessions that haven't started) are skipped so nothing is
    // recorded before the day's session begins.
    if (isFuture) return;
    const entries = students
      .map((s) => ({ studentId: s.id, status: draft[s.id] }))
      .filter(
        (e): e is { studentId: string; status: AttendanceStatus } => e.status != null,
      );
    if (entries.length === 0) return;
    try {
      await run(async () => {
        await saveDaily({ date, entries });
        setSavedStatuses(Object.fromEntries(entries.map((e) => [e.studentId, e.status])));
        await load(date, groupId);
        toast(t("attendance.saved"));
      });
    } catch (e) {
      console.error("Failed to save attendance", e);
      setError(t("attendance.errors.save"));
    }
  }

  return (
    <div className="space-y-4">
      <DailyToolbar
        date={date}
        groups={groups}
        groupId={groupId}
        loading={loading}
        saving={saving}
        isFuture={isFuture}
        saved={saved}
        onDateChange={onDateChange}
        onGroupChange={setGroupId}
        onSave={() => void handleSave()}
      />

      {dirty && !saving && students.length > 0 && (
        <p className="text-xs text-warning">{t("attendance.draftHint")}</p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <SummaryCards
        total={students.length}
        totalLabel="attendance.summary.total"
        counts={counts}
        unmarked={students.length - marked}
        rate={marked > 0 ? (counts.present + counts.late + counts.excused) / marked : null}
      />

      <DailyRosterCard
        loading={loading}
        students={students}
        hasSessionsToday={hasSessionsToday}
        sections={sections}
        ungrouped={ungrouped}
        draft={draft}
        onChange={handleRosterChange}
      />
    </div>
  );
}
