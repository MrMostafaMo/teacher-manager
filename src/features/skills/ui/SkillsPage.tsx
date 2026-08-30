import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TableRowsSkeleton } from "@/shared/Skeletons";
import { PageHeader } from "@/shared/PageHeader";
import { EmptyState } from "@/shared/EmptyState";
import { DataTable } from "@/shared/DataTable";
import { deleteSkill, listSkills } from "@/features/skills/application/skill-cases";
import type { SkillWithWeakCount } from "@/features/skills/infrastructure/skill-repo";
import type { Skill } from "@/lib/db/schema";
import { useConfirmDelete } from "@/shared/useConfirmDelete";
import { notifyUndo } from "@/lib/undo-store";
import { SkillFormDialog } from "./SkillFormDialog";
import { useSkillsColumns } from "./skills-columns";
import { toast } from "@/lib/toast-store";

export default function SkillsPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<SkillWithWeakCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Skill | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { armed: deletingId, request, clear } = useConfirmDelete();

  const bump = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    setLoading(true);
    listSkills()
      .then(setRows)
      .catch((e) => {
        console.error("Failed to load skills", e);
        toast(t("skills.loadError"), "error");
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [reloadKey, t]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!request(id)) return;
      try {
        const skill = rows.find((s) => s.id === id);
        const undoId = await deleteSkill(id);
        setRows((r) => r.filter((s) => s.id !== id));
        if (undoId !== null && skill) {
          notifyUndo(
            undoId,
            t("undo.deleted"),
            `${t("undo.skill")}: ${skill.name}`,
            t("undo.undo"),
          );
        }
      } catch (e) {
        console.error("Failed to delete skill", e);
        toast(t("skills.deleteError"), "error");
      } finally {
        clear();
      }
    },
    [request, clear, rows, t],
  );

  const openEdit = useCallback((s: Skill) => {
    setEditing(s);
    setFormOpen(true);
  }, []);

  const columns = useSkillsColumns(deletingId, openEdit, (id) => void handleDelete(id));
  const getRowKey = useCallback((s: SkillWithWeakCount) => s.id, []);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.skills")}
        description={t("skills.subtitle")}
        actions={
          <Button onClick={openCreate}>
            <Plus />
            {t("skills.add")}
          </Button>
        }
      />

      

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <TableRowsSkeleton rows={5} cols={4} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Target}
              title={t("skills.empty")}
              action={
                <Button onClick={() => setFormOpen(true)}>
                  <Plus />
                  {t("skills.add")}
                </Button>
              }
              description={t("skills.emptyHint")}
            />
          ) : (
            <DataTable<SkillWithWeakCount> columns={columns} rows={rows} getRowKey={getRowKey} />
          )}
        </CardContent>
      </Card>

      <SkillFormDialog
        open={formOpen}
        skill={editing}
        onClose={() => setFormOpen(false)}
        onSaved={bump}
      />
    </div>
  );
}
