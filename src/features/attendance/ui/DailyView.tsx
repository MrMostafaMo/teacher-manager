import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { getDaily } from "@/features/attendance/application/attendance-cases";
import { listGroups } from "@/features/groups/application/group-cases";
import type { GroupWithCount } from "@/features/groups/infrastructure/group-repo";
import type { AttendanceStatus } from "@/features/attendance/domain";
import type { Student } from "@/lib/db/schema";
import { useMemberships, buildSections } from "./attendance-sections";
import { SummaryCards } from "./SummaryCards";
import { DailyRosterCard } from "./DailyRosterCard";
import { DailyToolbar } from "./daily-toolbar";
import { DailyActions } from "./daily-actions";
import { useDailySave } from "./use-daily-save";
import { toast } from "@/lib/toast-store";

export function DailyView({
  date,
  onDateChange,
}: {
  date: string;
  onDateChange: (d: string) => void;
}) {
  const { t } = useTranslation();
  const [students, setStudents] = useState<Student[]>([]);
  const [draft, setDraft] = useState<Record<string, AttendanceStatus | undefined>>({});
  const [savedStatuses, setSavedStatuses] = useState<Record<string, AttendanceStatus | undefined>>(
    {},
  );
  const [loading, setLoading] = useState(true);
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
    try {
      const { students, rows, hasSessionsToday, defaults } = await getDaily(
        date,
        groupId || undefined,
      );
      const byId = Object.fromEntries(rows.map((r) => [r.studentId, r.status])) as Record<
        string,
        AttendanceStatus
      >;
      setHasSessionsToday(hasSessionsToday);
      setStudents(students);
      setSavedStatuses(byId);
      setDraft(Object.fromEntries(students.map((s) => [s.id, byId[s.id] ?? defaults[s.id]])));
    } catch (e) {
      console.error("Failed to load attendance", e);
      toast(t("attendance.errors.load"), "error");
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

  const { saving, saved, saveError, handleSave } = useDailySave({
    date,
    isFuture,
    students,
    draft,
    onSaved: async (statuses) => {
      setSavedStatuses(statuses);
      await load(date, groupId);
    },
  });

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

      <DailyActions
        date={date}
        groups={groups}
        groupId={groupId}
        students={students}
        draft={draft}
        saved={savedStatuses}
        onDraftChange={setDraft}
      />

      {dirty && !saving && students.length > 0 && (
        <p className="text-xs text-warning">{t("attendance.draftHint")}</p>
      )}

      {saveError && <p className="text-sm text-destructive">{saveError}</p>}

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
