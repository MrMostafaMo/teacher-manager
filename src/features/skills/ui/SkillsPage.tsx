import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PencilLine, Plus, Target, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TableRowsSkeleton } from "@/shared/Skeletons";
import { PageHeader } from "@/shared/PageHeader";
import { EmptyState } from "@/shared/EmptyState";
import { deleteSkill, listSkills } from "@/features/skills/application/skill-cases";
import type { SkillWithWeakCount } from "@/features/skills/infrastructure/skill-repo";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Skill } from "@/lib/db/schema";
import { SkillFormDialog } from "./SkillFormDialog";

export default function SkillsPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<SkillWithWeakCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Skill | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const bump = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    setLoading(true);
    setError("");
    listSkills()
      .then(setRows)
      .catch((e) => {
        console.error("Failed to load skills", e);
        setError(t("skills.loadError"));
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [reloadKey, t]);

  async function handleDelete(id: string) {
    if (deletingId !== id) {
      setDeletingId(id);
      setTimeout(() => setDeletingId((cur) => (cur === id ? null : cur)), 2500);
      return;
    }
    try {
      await deleteSkill(id);
      setRows((r) => r.filter((s) => s.id !== id));
    } catch (e) {
      console.error("Failed to delete skill", e);
      setError(t("skills.deleteError"));
    } finally {
      setDeletingId(null);
    }
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(s: Skill) {
    setEditing(s);
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <TableRowsSkeleton rows={5} cols={4} />
          ) : rows.length === 0 ? (
            <EmptyState icon={Target} title={t("skills.empty")} description={t("skills.emptyHint")} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-start font-medium">{t("skills.columns.name")}</th>
                    <th className="px-4 py-2.5 text-start font-medium">{t("skills.columns.tracked")}</th>
                    <th className="px-4 py-2.5 text-start font-medium">{t("skills.columns.weak")}</th>
                    <th className="px-4 py-2.5 text-start font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-2.5 font-medium">{s.name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground" dir="ltr">
                        {s.trackedCount}
                      </td>
                      <td className="px-4 py-2.5">
                        {s.weakCount > 0 ? (
                          <Badge
                            className={cn(
                              "border-warning bg-warning/15 text-warning",
                            )}
                          >
                            {t("skills.weakCount", { count: s.weakCount })}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(s)}>
                            <PencilLine />
                            <span className="sr-only">{t("skills.edit")}</span>
                          </Button>
                          <Button
                            variant={deletingId === s.id ? "destructive" : "ghost"}
                            size="icon-sm"
                            aria-label={
                              deletingId === s.id ? t("skills.confirmDelete") : t("skills.delete")
                            }
                            onClick={() => void handleDelete(s.id)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
