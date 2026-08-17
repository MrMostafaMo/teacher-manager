import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TableRowsSkeleton } from "@/shared/Skeletons";
import { PageHeader } from "@/shared/PageHeader";
import { EmptyState } from "@/shared/EmptyState";
import { deleteExam, listExams, type ExamListItem } from "@/features/exams/application/exam-cases";
import { listGroups } from "@/features/groups/application/group-cases";
import type { Exam, StudyGroup } from "@/lib/db/schema";
import { useConfirmDelete } from "@/shared/useConfirmDelete";
import { useCollapsedSections } from "@/shared/useCollapsedSections";
import { notifyUndo } from "@/lib/undo-store";
import { ExamFormDialog } from "./ExamFormDialog";
import { ExamDetailDialog } from "./ExamDetailDialog";
import { ExamGroupSections } from "./exam-sections";

export default function ExamsPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<ExamListItem[]>([]);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);
  const [defaultGroupId, setDefaultGroupId] = useState<string | undefined>(undefined);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { armed: deletingId, request, clear } = useConfirmDelete();
  const { isCollapsed, toggle } = useCollapsedSections();

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
    listExams()
      .then(setRows)
      .catch((e) => {
        console.error("Failed to load exams", e);
        setError(t("exams.loadError"));
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [reloadKey, t]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!request(id)) return;
      try {
        const row = rows.find((e) => e.id === id);
        const undoId = await deleteExam(id);
        setRows((r) => r.filter((e) => e.id !== id));
        if (undoId !== null && row) {
          notifyUndo(undoId, t("undo.deleted"), `${t("undo.exam")}: ${row.title}`, t("undo.undo"));
        }
      } catch (e) {
        console.error("Failed to delete exam", e);
        setError(t("exams.deleteError"));
      } finally {
        clear();
      }
    },
    [request, clear, rows, t],
  );

  const openEdit = useCallback((e: Exam) => {
    setEditing(e);
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
        title={t("nav.exams")}
        description={t("exams.subtitle")}
        actions={
          <Button onClick={() => openCreate()}>
            <Plus />
            {t("exams.add")}
          </Button>
        }
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading || groupsLoading ? (
        <TableRowsSkeleton rows={5} cols={4} />
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={ClipboardList}
              title={t("exams.empty")}
              description={t("exams.emptyHint")}
            />
          </CardContent>
        </Card>
      ) : (
        <ExamGroupSections
          groups={groups}
          rows={rows}
          isCollapsed={isCollapsed}
          deletingId={deletingId}
          onToggle={toggle}
          onAdd={openCreate}
          onDetail={setDetailId}
          onEdit={openEdit}
          onDelete={(id) => void handleDelete(id)}
        />
      )}

      <ExamFormDialog
        open={formOpen}
        exam={editing}
        groups={groups}
        defaultGroupId={defaultGroupId}
        onClose={() => setFormOpen(false)}
        onSaved={bump}
      />
      <ExamDetailDialog
        open={detailId !== null}
        examId={detailId}
        onClose={() => setDetailId(null)}
        onChanged={bump}
      />
    </div>
  );
}
