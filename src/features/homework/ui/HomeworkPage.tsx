import { useCallback, useEffect, useState } from "react";
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
import { HomeworkFormDialog } from "./HomeworkFormDialog";
import { HomeworkDetailDialog } from "./HomeworkDetailDialog";
import { HomeworksSection } from "./homework-sections";

export default function HomeworkPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<HomeworkListItem[]>([]);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Homework | null>(null);
  const [defaultGroupId, setDefaultGroupId] = useState<string | undefined>(undefined);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { armed: deletingId, request, clear } = useConfirmDelete();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const bump = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    void listGroups()
      .then(setGroups)
      .catch(() => setGroups([]))
      .finally(() => setGroupsLoading(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    listHomeworks()
      .then(setRows)
      .catch((e) => {
        console.error("Failed to load homeworks", e);
        setError(t("homework.loadError"));
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [reloadKey, t]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!request(id)) return;
      try {
        await deleteHomework(id);
        setRows((r) => r.filter((h) => h.id !== id));
      } catch (e) {
        console.error("Failed to delete homework", e);
        setError(t("homework.deleteError"));
      } finally {
        clear();
      }
    },
    [request, clear, t],
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading || groupsLoading ? (
        <TableRowsSkeleton rows={5} cols={4} />
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState icon={BookOpen} title={t("homework.empty")} description={t("homework.emptyHint")} />
          </CardContent>
        </Card>
      ) : (
        <HomeworksSection
          groups={groups}
          rows={rows}
          collapsed={collapsed}
          deletingId={deletingId}
          onToggle={(id) => setCollapsed((c) => ({ ...c, [id]: !c[id] }))}
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
