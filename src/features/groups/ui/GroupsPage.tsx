import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, Pencil, Plus, Trash2, Users2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TableRowsSkeleton } from "@/shared/Skeletons";
import { PageHeader } from "@/shared/PageHeader";
import { EmptyState } from "@/shared/EmptyState";
import { DataTable, type DataTableColumn } from "@/shared/DataTable";
import {
  deleteGroup,
  listGroups,
} from "@/features/groups/application/group-cases";
import { listSchedule } from "@/features/schedule/application/schedule-cases";
import type { GroupWithCount } from "@/features/groups/infrastructure/group-repo";
import type { GroupSession, StudyGroup } from "@/lib/db/schema";
import { StatusBadge } from "@/features/students/ui/StatusBadge";
import { GroupDetailDialog } from "./GroupDetailDialog";
import { GroupFormDialog } from "./GroupFormDialog";
import { formatTime } from "@/lib/utils/format";
import { useTimeStore } from "@/lib/time-store";

const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export default function GroupsPage() {
  const { t } = useTranslation();
  const hour24 = useTimeStore((s) => s.hour24);
  const [rows, setRows] = useState<GroupWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StudyGroup | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sessionsByGroup, setSessionsByGroup] = useState<Record<string, GroupSession[]>>({});

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [groups, sessions] = await Promise.all([listGroups(), listSchedule()]);
      setRows(groups);
      const byGroup: Record<string, GroupSession[]> = {};
      for (const s of sessions) {
        (byGroup[s.groupId] ??= []).push(s);
      }
      setSessionsByGroup(byGroup);
    } catch (error) {
      console.error("Failed to load groups", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const detail = detailId ? rows.find((g) => g.id === detailId) : undefined;

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(group: StudyGroup) {
    setDetailId(null);
    setEditing(group);
    setFormOpen(true);
  }

  function renderSchedule(g: GroupWithCount) {
    const sessions = sessionsByGroup[g.id] ?? [];
    if (sessions.length === 0) return g.schedule ?? "—";
    return sessions
      .map(
        (s) =>
          `${t(`schedule.days.${DAY_NAMES[s.dayOfWeek]}`)} ${formatTime(s.startTime, hour24)}–${formatTime(s.endTime, hour24)}`,
      )
      .join(" · ");
  }

  async function handleRowDelete(group: StudyGroup) {
    if (deletingId !== group.id) {
      setDeletingId(group.id);
      setTimeout(() => setDeletingId((cur) => (cur === group.id ? null : cur)), 2500);
      return;
    }
    try {
      await deleteGroup(group.id);
      void reload();
    } catch (error) {
      console.error("Failed to delete group", error);
    } finally {
      setDeletingId(null);
    }
  }

  const columns: DataTableColumn<GroupWithCount>[] = [
    {
      header: t("groups.columns.name"),
      className: "font-medium",
      render: (g) => g.name,
    },
    {
      header: t("groups.columns.subject"),
      className: "text-muted-foreground",
      render: (g) => g.subject ?? "—",
    },
    {
      header: t("groups.columns.schedule"),
      className: "text-muted-foreground",
      render: (g) => renderSchedule(g),
    },
    {
      header: t("groups.columns.members"),
      className: "text-muted-foreground tabular-nums",
      render: (g) => g.memberCount,
    },
    {
      header: t("groups.columns.status"),
      render: (g) => <StatusBadge status={g.status} />,
    },
    {
      header: "",
      className: "text-end",
      headerClassName: "text-end",
      render: (g) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("groups.view")}
            onClick={() => setDetailId(g.id)}
          >
            <Eye />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("groups.edit")}
            onClick={() => openEdit(g)}
          >
            <Pencil />
          </Button>
          <Button
            variant={deletingId === g.id ? "destructive" : "ghost"}
            size="icon-sm"
            aria-label={
              deletingId === g.id ? t("groups.confirmDelete") : t("groups.delete")
            }
            onClick={() => void handleRowDelete(g)}
          >
            <Trash2 />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.groups")}
        description={t("groups.subtitle")}
        actions={
          <Button onClick={openCreate}>
            <Plus />
            {t("groups.add")}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          <Users2 className="size-3.5" />
          {rows.length}
        </Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <TableRowsSkeleton rows={4} cols={3} />
          ) : rows.length === 0 ? (
            <EmptyState icon={Users2} title={t("groups.empty")} description={t("groups.emptyHint")} />
          ) : (
            <DataTable<GroupWithCount>
              columns={columns}
              rows={rows}
              getRowKey={(g) => g.id}
            />
          )}
        </CardContent>
      </Card>

      <GroupFormDialog
        open={formOpen}
        group={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => void reload()}
      />
      {detail && (
        <GroupDetailDialog
          group={detail}
          onClose={() => setDetailId(null)}
          onEdit={() => openEdit(detail)}
          onChanged={() => void reload()}
        />
      )}
    </div>
  );
}
