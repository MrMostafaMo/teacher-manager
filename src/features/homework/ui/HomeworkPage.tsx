import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/shared/PageHeader";
import { TableRowsSkeleton } from "@/shared/Skeletons";
import { EmptyState } from "@/shared/EmptyState";
import {
  deleteHomework,
  listHomeworks,
  type HomeworkListItem,
} from "@/features/homework/application/homework-cases";
import { listGroups } from "@/features/groups/application/group-cases";
import type { Homework, StudyGroup } from "@/lib/db/schema";
import { useConfirmDelete } from "@/shared/useConfirmDelete";
import { useCollapsedSections } from "@/shared/useCollapsedSections";
import { useDataChanged } from "@/shared/useDataChanged";
import { notifyUndo } from "@/lib/undo-store";
import { HomeworkFormDialog } from "./HomeworkFormDialog";
import { HomeworkDetailDialog } from "./HomeworkDetailDialog";
import { HomeworksSection } from "./homework-sections";
import { toast } from "@/lib/toast-store";

export default function HomeworkPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<HomeworkListItem[]>([]);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Homework | null>(null);
  const [defaultGroupId, setDefaultGroupId] = useState<string | undefined>(undefined);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { armed: deletingId, request, clear } = useConfirmDelete();
  const [searchParams] = useSearchParams();
  const groupFilter = searchParams.get("group");
  const { isCollapsed, toggle } = useCollapsedSections(
    groupFilter ? { [groupFilter]: false } : undefined,
  );

  const bump = useCallback(() => setReloadKey((k) => k + 1), []);

  useDataChanged(bump);

  useEffect(() => {
    void listGroups()
      .then(setGroups)
      .catch(() => setGroups([]))
      .finally(() => setGroupsLoading(false));
  }, []);

  useEffect(() => {
    if (rows.length === 0) setLoading(true);
    listHomeworks()
      .then(setRows)
      .catch((e) => {
        console.error("Failed to load homeworks", e);
        toast(t("homework.loadError"), "error");
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [reloadKey, t]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!request(id)) return;
      try {
        const row = rows.find((h) => h.id === id);
        const undoId = await deleteHomework(id);
        setRows((r) => r.filter((h) => h.id !== id));
        if (undoId !== null && row) {
          notifyUndo(
            undoId,
            t("undo.deleted"),
            `${t("undo.homework")}: ${row.title}`,
            t("undo.undo"),
          );
        }
      } catch (e) {
        console.error("Failed to delete homework", e);
        toast(t("homework.deleteError"), "error");
      } finally {
        clear();
      }
    },
    [request, clear, rows, t],
  );

  const openEdit = useCallback((h: Homework) => {
    setEditing(h);
    setFormOpen(true);
  }, []);

  const openCreate = useCallback((groupId?: string) => {
    setDefaultGroupId(groupId);
    setEditing(null);
    setFormOpen(true);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.homework")}
        description={t("homework.subtitle")}
        actions={
          <Button onClick={() => openCreate()}>
            <Plus />
            {t("homework.add")}
          </Button>
        }
      />

      

      {(loading && rows.length === 0) || (groupsLoading && groups.length === 0) ? (
        <TableRowsSkeleton rows={5} cols={4} />
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={BookOpen}
              title={t("homework.empty")}
              description={t("homework.emptyHint")}
            />
          </CardContent>
        </Card>
      ) : (
        <HomeworksSection
          groups={groups}
          rows={rows}
          isCollapsed={isCollapsed}
          deletingId={deletingId}
          onToggle={toggle}
          onCreate={(groupId) => openCreate(groupId)}
          onDetail={setDetailId}
          onEdit={openEdit}
          onDelete={(id) => void handleDelete(id)}
        />
      )}

      <HomeworkFormDialog
        open={formOpen}
        homework={editing}
        groups={groups}
        defaultGroupId={defaultGroupId}
        onClose={() => setFormOpen(false)}
        onSaved={bump}
      />
      <HomeworkDetailDialog
        open={detailId !== null}
        homeworkId={detailId}
        onClose={() => setDetailId(null)}
        onChanged={bump}
      />
    </div>
  );
}
