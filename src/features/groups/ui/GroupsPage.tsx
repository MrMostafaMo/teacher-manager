import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Users2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TableRowsSkeleton } from "@/shared/Skeletons";
import { PageHeader } from "@/shared/PageHeader";
import { EmptyState } from "@/shared/EmptyState";
import {
  deleteGroup,
  listGroups,
} from "@/features/groups/application/group-cases";
import { listSchedule } from "@/features/schedule/application/schedule-cases";
import type { GroupWithCount } from "@/features/groups/infrastructure/group-repo";
import type { GroupSession, StudyGroup } from "@/lib/db/schema";
import { useConfirmDelete } from "@/shared/useConfirmDelete";
import { GroupDetailDialog } from "./GroupDetailDialog";
import { GroupFormDialog } from "./GroupFormDialog";
import { GroupsTable } from "./groups-table";

export default function GroupsPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<GroupWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StudyGroup | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const { armed: deletingId, request, clear } = useConfirmDelete();
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

  const openEdit = useCallback((group: StudyGroup) => {
    setDetailId(null);
    setEditing(group);
    setFormOpen(true);
  }, []);

  const handleRowDelete = useCallback(
    async (group: StudyGroup) => {
      if (!request(group.id)) return;
      try {
        await deleteGroup(group.id);
        void reload();
      } catch (error) {
        console.error("Failed to delete group", error);
      } finally {
        clear();
      }
    },
    [request, clear, reload],
  );

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
            <GroupsTable
              rows={rows}
              deletingId={deletingId}
              sessionsByGroup={sessionsByGroup}
              onView={setDetailId}
              onOpen={openEdit}
              onDelete={handleRowDelete}
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
