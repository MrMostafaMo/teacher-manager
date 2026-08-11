import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listGroups } from "@/features/groups/application/group-cases";
import { deleteSession, listSchedule } from "@/features/schedule/application/schedule-cases";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import type { GroupSession, StudyGroup } from "@/lib/db/schema";
import { PageHeader } from "@/shared/PageHeader";
import { EmptyState } from "@/shared/EmptyState";
import { useConfirmDelete } from "@/shared/useConfirmDelete";
import WeekGrid from "./WeekGrid";
import { ScheduleFormDialog } from "./ScheduleFormDialog";
import { ScheduleGroupsView } from "./schedule-groups-view";
import { ScheduleHeaderActions } from "./schedule-header-actions";
import { SessionAttendanceDialog } from "./SessionAttendanceDialog";
import { useScheduleView } from "./use-schedule-view";

export default function SchedulePage() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<SessionWithGroup[]>([]);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"day" | "group">("day");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GroupSession | null>(null);
  const [attendanceSession, setAttendanceSession] = useState<SessionWithGroup | null>(null);
  const { armed: deletingId, request, clear } = useConfirmDelete();

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [all, allGroups] = await Promise.all([listSchedule(), listGroups()]);
      setSessions(all);
      setGroups(allGroups.filter((g) => g.status === "active"));
      setMemberCounts(Object.fromEntries(allGroups.map((g) => [g.id, g.memberCount])));
    } catch (error) {
      console.error("Failed to load schedule", error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const { byDay, conflicts, byGroup } = useScheduleView(sessions);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(session: GroupSession) {
    setEditing(session);
    setFormOpen(true);
  }

  async function handleDelete(session: GroupSession) {
    if (!request(session.id)) return;
    try {
      await deleteSession(session.id);
      void reload();
    } catch (error) {
      console.error("Failed to delete session", error);
    } finally {
      clear();
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.schedule")}
        description={t("schedule.subtitle")}
        actions={
          <ScheduleHeaderActions
            count={sessions.length}
            canAdd={groups.length > 0}
            view={view}
            onViewChange={setView}
            onCreate={openCreate}
          />
        }
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={CalendarDays}
              title={groups.length === 0 ? t("schedule.noGroups") : t("schedule.empty")}
              description={t("schedule.emptyHint")}
            />
          </CardContent>
        </Card>
      ) : view === "day" ? (
        <WeekGrid
          byDay={byDay}
          conflicts={conflicts}
          deletingId={deletingId}
          onEdit={openEdit}
          onDelete={(s) => void handleDelete(s)}
          onAttend={(s) => setAttendanceSession(s)}
        />
      ) : (
        <ScheduleGroupsView
          byGroup={byGroup}
          memberCounts={memberCounts}
          conflicts={conflicts}
          deletingId={deletingId}
          onEdit={openEdit}
          onDelete={(s) => void handleDelete(s)}
          onAttend={(s) => setAttendanceSession(s)}
        />
      )}

      <ScheduleFormDialog
        open={formOpen}
        session={editing}
        groups={groups}
        onClose={() => setFormOpen(false)}
        onSaved={() => void reload()}
      />

      <SessionAttendanceDialog
        open={attendanceSession !== null}
        session={attendanceSession}
        onClose={() => setAttendanceSession(null)}
        onSaved={() => undefined}
      />
    </div>
  );
}
