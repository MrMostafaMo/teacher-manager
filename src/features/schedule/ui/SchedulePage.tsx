import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarCheck, CalendarDays, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listGroups } from "@/features/groups/application/group-cases";
import { deleteSession, listSchedule } from "@/features/schedule/application/schedule-cases";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import type { GroupSession, StudyGroup } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils/format";
import { useTimeStore } from "@/lib/time-store";
import WeekGrid from "./WeekGrid";
import { ScheduleFormDialog } from "./ScheduleFormDialog";
import { SessionAttendanceDialog } from "./SessionAttendanceDialog";

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

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
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const byDay = useMemo(() => {
    const buckets: SessionWithGroup[][] = DAYS.map(() => []);
    for (const s of sessions) buckets[s.dayOfWeek].push(s);
    return buckets;
  }, [sessions]);

  /** Sessions sharing a day + room whose time ranges overlap. */
  const conflicts = useMemo(() => {
    const ids = new Set<string>();
    for (const daySessions of byDay) {
      const byRoom = new Map<string, SessionWithGroup[]>();
      for (const s of daySessions) {
        if (!s.room) continue;
        const list = byRoom.get(s.room) ?? [];
        list.push(s);
        byRoom.set(s.room, list);
      }
      for (const roomSessions of byRoom.values()) {
        for (let i = 0; i < roomSessions.length; i++) {
          for (let j = i + 1; j < roomSessions.length; j++) {
            const a = roomSessions[i];
            const b = roomSessions[j];
            if (a.startTime < b.endTime && b.startTime < a.endTime) {
              ids.add(a.id);
              ids.add(b.id);
            }
          }
        }
      }
    }
    return ids;
  }, [byDay]);

  const byGroup = useMemo(() => {
    const map = new Map<string, SessionWithGroup[]>();
    for (const s of sessions) {
      const list = map.get(s.groupId) ?? [];
      list.push(s);
      map.set(s.groupId, list);
    }
    return [...map.entries()].sort((a, b) => a[1][0].groupName.localeCompare(b[1][0].groupName));
  }, [sessions]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(session: GroupSession) {
    setEditing(session);
    setFormOpen(true);
  }

  async function handleDelete(session: GroupSession) {
    if (deletingId !== session.id) {
      setDeletingId(session.id);
      setTimeout(() => setDeletingId((cur) => (cur === session.id ? null : cur)), 2500);
      return;
    }
    try {
      await deleteSession(session.id);
      void reload();
    } catch (error) {
      console.error("Failed to delete session", error);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">{t("nav.schedule")}</h2>
          <p className="text-sm text-muted-foreground">{t("schedule.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            <CalendarDays className="size-3.5" />
            {sessions.length}
          </Badge>
          <div className="flex gap-1">
            {(["day", "group"] as const).map((v) => (
              <Button
                key={v}
                variant={view === v ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setView(v)}
              >
                {t(`schedule.view.${v}`)}
              </Button>
            ))}
          </div>
          <Button onClick={openCreate} disabled={groups.length === 0}>
            <Plus />
            {t("schedule.add")}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-10 text-center text-sm text-muted-foreground">{t("schedule.loading")}</div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
              <CalendarDays className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">
              {groups.length === 0 ? t("schedule.noGroups") : t("schedule.empty")}
            </p>
            <p className="text-sm text-muted-foreground">{t("schedule.emptyHint")}</p>
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
        <div className="space-y-4">
          {byGroup.map(([groupId, groupSessions]) => (
            <Card key={groupId}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">{groupSessions[0].groupName}</h3>
                  <Badge variant="secondary">
                    <Users className="size-3.5" />
                    {memberCounts[groupId] ?? 0} {t("schedule.members")}
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {groupSessions.map((s) => (
                    <SessionCard
                      key={s.id}
                      session={s}
                      memberCount={memberCounts[s.groupId] ?? 0}
                      conflicted={conflicts.has(s.id)}
                      deleting={deletingId === s.id}
                      onEdit={openEdit}
                      onDelete={() => void handleDelete(s)}
                      onAttend={() => setAttendanceSession(s)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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

function SessionCard({
  session,
  memberCount,
  conflicted,
  deleting,
  onEdit,
  onDelete,
  onAttend,
}: {
  session: SessionWithGroup;
  memberCount: number;
  conflicted: boolean;
  deleting: boolean;
  onEdit: (s: GroupSession) => void;
  onDelete: () => void;
  onAttend: () => void;
}) {
  const { t } = useTranslation();
  const hour24 = useTimeStore((s) => s.hour24);
  return (
    <div
      className={cn(
        "rounded-lg border bg-muted/40 p-2.5",
        conflicted && "border-destructive/60 ring-1 ring-destructive/40",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{session.groupName}</p>
          <p className="text-xs text-muted-foreground">
            {formatTime(session.startTime, hour24)} – {formatTime(session.endTime, hour24)}
          </p>
          <p className="text-xs text-muted-foreground">
            {session.room ? `${t("schedule.room")}: ${session.room}` : t("schedule.noRoom")}
          </p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3" />
            {memberCount} {t("schedule.members")}
          </p>
          {conflicted && (
            <p className="text-xs font-medium text-destructive">{t("schedule.conflict")}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("schedule.attend")}
            onClick={onAttend}
          >
            <CalendarCheck />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("schedule.edit")}
            onClick={() => onEdit(session)}
          >
            <Pencil />
          </Button>
          <Button
            variant={deleting ? "destructive" : "ghost"}
            size="icon-sm"
            aria-label={deleting ? t("schedule.confirmDelete") : t("schedule.delete")}
            onClick={onDelete}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    </div>
  );
}
