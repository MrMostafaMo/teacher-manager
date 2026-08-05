import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listGroups } from "@/features/groups/application/group-cases";
import { deleteSession, listSchedule } from "@/features/schedule/application/schedule-cases";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import type { GroupSession, StudyGroup } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { ScheduleFormDialog } from "./ScheduleFormDialog";

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export default function SchedulePage() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<SessionWithGroup[]>([]);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GroupSession | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const today = new Date().getDay();

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [all, allGroups] = await Promise.all([listSchedule(), listGroups()]);
      setSessions(all);
      setGroups(allGroups.filter((g) => g.status === "active"));
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
        <Button onClick={openCreate} disabled={groups.length === 0}>
          <Plus />
          {t("schedule.add")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          <CalendarDays className="size-3.5" />
          {sessions.length}
        </Badge>
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
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7">
          {byDay.map((daySessions, day) => (
            <div
              key={day}
              className={cn(
                "flex flex-col gap-2 rounded-xl border bg-card p-3",
                day === today && "ring-2 ring-ring",
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{t(`schedule.days.${DAYS[day]}`)}</h3>
                {day === today && (
                  <Badge variant="secondary" className="text-[10px]">
                    {t("schedule.today")}
                  </Badge>
                )}
              </div>
              {daySessions.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("schedule.noRoom")}</p>
              ) : (
                daySessions.map((s) => (
                  <div key={s.id} className="rounded-lg border bg-muted/40 p-2.5">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{s.groupName}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.startTime} – {s.endTime}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {s.room ? `${t("schedule.room")}: ${s.room}` : t("schedule.noRoom")}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("schedule.edit")}
                          onClick={() => openEdit(s)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant={deletingId === s.id ? "destructive" : "ghost"}
                          size="icon-sm"
                          aria-label={
                            deletingId === s.id ? t("schedule.confirmDelete") : t("schedule.delete")
                          }
                          onClick={() => void handleDelete(s)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
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
    </div>
  );
}
