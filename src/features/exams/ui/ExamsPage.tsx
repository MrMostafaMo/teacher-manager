import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ClipboardList, PencilLine, Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CollapsibleSection } from "@/shared/CollapsibleSection";
import { deleteExam, listExams, type ExamListItem } from "@/features/exams/application/exam-cases";
import { listGroups } from "@/features/groups/application/group-cases";
import type { Exam, StudyGroup } from "@/lib/db/schema";
import { ExamFormDialog } from "./ExamFormDialog";
import { ExamDetailDialog } from "./ExamDetailDialog";

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
    listExams()
      .then(setRows)
      .catch((e) => {
        console.error("Failed to load exams", e);
        setError(t("exams.loadError"));
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
      await deleteExam(id);
      setRows((r) => r.filter((e) => e.id !== id));
    } catch (e) {
      console.error("Failed to delete exam", e);
      setError(t("exams.deleteError"));
    } finally {
      setDeletingId(null);
    }
  }

  function openCreate(groupId?: string) {
    setEditing(null);
    setDefaultGroupId(groupId);
    setFormOpen(true);
  }

  function openEdit(e: Exam) {
    setEditing(e);
    setFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">{t("nav.exams")}</h2>
          <p className="text-sm text-muted-foreground">{t("exams.subtitle")}</p>
        </div>
        <Button onClick={() => openCreate()}>
          <Plus />
          {t("exams.add")}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading || groupsLoading ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            {t("students.loading")}
          </CardContent>
        </Card>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
              <ClipboardList className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">{t("exams.empty")}</p>
            <p className="text-xs text-muted-foreground">{t("exams.emptyHint")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const items = rows.filter((e) => e.groupId === g.id);
            const isCollapsed = !!collapsed[g.id];
            return (
              <CollapsibleSection
                key={g.id}
                title={g.name}
                meta={items.length}
                collapsed={isCollapsed}
                onToggle={() => setCollapsed((c) => ({ ...c, [g.id]: !isCollapsed }))}
                actions={
                  <Button size="sm" variant="outline" onClick={() => openCreate(g.id)}>
                    <Plus />
                    {t("exams.add")}
                  </Button>
                }
              >
                {items.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    {t("exams.sectionEmpty")}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="px-4 py-2.5 text-start font-medium">{t("exams.columns.title")}</th>
                          <th className="px-4 py-2.5 text-start font-medium">{t("exams.columns.date")}</th>
                          <th className="px-4 py-2.5 text-start font-medium">{t("exams.columns.maxScore")}</th>
                          <th className="px-4 py-2.5 text-start font-medium">{t("exams.columns.completion")}</th>
                          <th className="px-4 py-2.5 text-start font-medium">{t("exams.columns.average")}</th>
                          <th className="px-4 py-2.5 text-start font-medium" />
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((e) => (
                          <tr key={e.id} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="px-4 py-2.5 font-medium">{e.title}</td>
                            <td className="px-4 py-2.5 text-muted-foreground" dir="ltr">
                              {e.date ?? "—"}
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground" dir="ltr">
                              {e.maxScore}
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className="h-full rounded-full bg-emerald-600"
                                    style={{ width: `${e.completion}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground" dir="ltr">
                                  {e.completion}%
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground" dir="ltr">
                              {e.average ?? "—"}
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon-sm" onClick={() => setDetailId(e.id)}>
                                  <Users />
                                  <span className="sr-only">{t("exams.detail")}</span>
                                </Button>
                                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(e)}>
                                  <PencilLine />
                                  <span className="sr-only">{t("exams.edit")}</span>
                                </Button>
                                <Button
                                  variant={deletingId === e.id ? "destructive" : "ghost"}
                                  size="icon-sm"
                                  aria-label={
                                    deletingId === e.id
                                      ? t("exams.confirmDelete")
                                      : t("exams.delete")
                                  }
                                  onClick={() => void handleDelete(e.id)}
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
              </CollapsibleSection>
            );
          })}
        </div>
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
