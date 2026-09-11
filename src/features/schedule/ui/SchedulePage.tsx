import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { isOneOff } from "@/features/schedule/application/schedule-one-offs";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import type { GroupSession } from "@/lib/db/schema";
import { PageHeader } from "@/shared/PageHeader";
import { EmptyState } from "@/shared/EmptyState";
import { useCollapsedSections } from "@/shared/useCollapsedSections";
import WeekGrid from "./WeekGrid";
import { ScheduleGroupsView } from "./schedule-groups-view";
import { ScheduleHeaderActions } from "./schedule-header-actions";
import { OneOffSessionDialog } from "./OneOffSessionDialog";
import { ScheduleFormDialog } from "./ScheduleFormDialog";
import { SessionAttendanceDialog } from "./SessionAttendanceDialog";
import { SessionOccurrenceDialog } from "./SessionOccurrenceDialog";
import { useScheduleData } from "./use-schedule-data";
import { useScheduleDelete } from "./use-schedule-delete";
import { useScheduleView } from "./use-schedule-view";
import { useScheduleDnD } from "./use-schedule-dnd";

export default function SchedulePage() {
  const { t } = useTranslation();
  const { sessions, groups, memberCounts, exceptions, loading, reload } = useScheduleData();
  const [view, setView] = useState<"day" | "group">("day");
  const [formOpen, setFormOpen] = useState(false);
  const [oneOffOpen, setOneOffOpen] = useState(false);
  const [editing, setEditing] = useState<GroupSession | null>(null);
  const [attendanceSession, setAttendanceSession] = useState<{
    session: SessionWithGroup;
    date?: string;
  } | null>(null);
  const [occurrence, setOccurrence] = useState<{ session: SessionWithGroup; date: string } | null>(
    null,
  );
  const { byDay, conflicts, byGroup, oneOffs } = useScheduleView(sessions);
  const { isCollapsed, toggle } = useCollapsedSections();
  const { moveSession } = useScheduleDnD(sessions, reload);
  const { deletingId, handleDelete } = useScheduleDelete(groups, reload);

  const dateKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  function openForm(s?: GroupSession) {
    setEditing(s ?? null);
    setFormOpen(true);
  }

  function handleAttend(session: SessionWithGroup) {
    setAttendanceSession({
      session,
      date: isOneOff(session) ? (session.oneOffDate ?? undefined) : undefined,
    });
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
            onCreate={() => openForm()}
            onCreateOneOff={() => setOneOffOpen(true)}
          />
        }
      />
      {loading && sessions.length === 0 ? (
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
          oneOffs={oneOffs}
          exceptions={exceptions}
          deletingId={deletingId}
          onEdit={openForm}
          onDelete={(s) => void handleDelete(s)}
          onAttend={handleAttend}
          onOccurrence={(s, date) => setOccurrence({ session: s, date })}
          onMoveSession={(id, day, startMin) => void moveSession(id, day, startMin)}
        />
      ) : (
        <ScheduleGroupsView
          byGroup={byGroup}
          memberCounts={memberCounts}
          exceptions={exceptions}
          oneOffs={oneOffs}
          today={dateKey}
          isCollapsed={isCollapsed}
          onToggle={toggle}
          conflicts={conflicts}
          deletingId={deletingId}
          onEdit={openForm}
          onDelete={(s) => void handleDelete(s)}
          onAttend={handleAttend}
        />
      )}
      <ScheduleFormDialog
        open={formOpen}
        session={editing}
        groups={groups}
        onClose={() => setFormOpen(false)}
        onSaved={() => void reload()}
      />
      <OneOffSessionDialog
        open={oneOffOpen}
        groups={groups}
        onClose={() => setOneOffOpen(false)}
        onSaved={() => void reload()}
      />
      <SessionAttendanceDialog
        open={attendanceSession !== null}
        session={attendanceSession?.session ?? null}
        initialDate={attendanceSession?.date}
        onClose={() => setAttendanceSession(null)}
        onSaved={() => undefined}
      />
      <SessionOccurrenceDialog
        open={occurrence !== null}
        session={occurrence?.session ?? null}
        date={occurrence?.date ?? ""}
        exception={
          occurrence && !isOneOff(occurrence.session)
            ? (exceptions.find(
                (ex) => ex.sessionId === occurrence.session.id && ex.date === occurrence.date,
              ) ?? null)
            : null
        }
        movedFrom={
          occurrence && isOneOff(occurrence.session)
            ? (occurrence.session.movedFromDate ?? null)
            : null
        }
        onClose={() => setOccurrence(null)}
        onSaved={() => void reload()}
      />
    </div>
  );
}
