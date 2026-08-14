import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteSession } from "@/features/schedule/application/schedule-cases";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import type { GroupSession } from "@/lib/db/schema";
import { PageHeader } from "@/shared/PageHeader";
import { EmptyState } from "@/shared/EmptyState";
import { useConfirmDelete } from "@/shared/useConfirmDelete";
import { notifyUndo } from "@/lib/undo-store";
import WeekGrid from "./WeekGrid";
import { ScheduleFormDialog } from "./ScheduleFormDialog";
import { SessionOccurrenceDialog } from "./SessionOccurrenceDialog";
import { ScheduleGroupsView } from "./schedule-groups-view";
import { ScheduleHeaderActions } from "./schedule-header-actions";
import { SessionAttendanceDialog } from "./SessionAttendanceDialog";
import { useScheduleData } from "./use-schedule-data";
import { useScheduleView } from "./use-schedule-view";

export default function SchedulePage() {
  const { t } = useTranslation();
  const { sessions, groups, memberCounts, exceptions, loading, reload } = useScheduleData();
  const [view, setView] = useState<"day" | "group">("day");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GroupSession | null>(null);
  const [attendanceSession, setAttendanceSession] = useState<SessionWithGroup | null>(null);
  const [occurrence, setOccurrence] = useState<{ session: SessionWithGroup; date: string } | null>(null);
  const { armed: deletingId, request, clear } = useConfirmDelete();

  const { byDay, conflicts, byGroup } = useScheduleView(sessions);

  const occurrenceException = occurrence
    ? (exceptions.find(
        (ex) => ex.sessionId === occurrence.session.id && ex.date === occurrence.date,
      ) ?? null)
    : null;

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
      const undoId = await deleteSession(session.id);
      void reload();
      if (undoId !== null) {
        const groupName = groups.find((g) => g.id === session.groupId)?.name;
        notifyUndo(
          undoId,
          t("undo.deleted"),
          `${t("undo.session")}: ${groupName ?? ""} ${session.startTime}`,
          t("undo.undo"),
        );
      }
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
          exceptions={exceptions}
          deletingId={deletingId}
          onEdit={openEdit}
          onDelete={(s) => void handleDelete(s)}
          onAttend={(s) => setAttendanceSession(s)}
          onOccurrence={(s, date) => setOccurrence({ session: s, date })}
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

      <SessionOccurrenceDialog
        open={occurrence !== null}
        session={occurrence?.session ?? null}
        date={occurrence?.date ?? ""}
        exception={occurrenceException}
        onClose={() => setOccurrence(null)}
        onSaved={() => void reload()}
      />
    </div>
  );
}
