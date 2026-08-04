import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, CalendarDays, Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  deleteHomework,
  listHomeworks,
  type HomeworkListItem,
} from "@/features/homework/application/homework-cases";
import { listGroups } from "@/features/groups/application/group-cases";
import type { Homework, StudyGroup } from "@/lib/db/schema";
import { HomeworkFormDialog } from "./HomeworkFormDialog";
import { HomeworkDetailDialog } from "./HomeworkDetailDialog";

export default function HomeworkPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<HomeworkListItem[]>([]);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Homework | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const bump = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    void listGroups()
      .then(setGroups)
      .catch(() => setGroups([]));
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

  async function handleDelete(id: string) {
    if (deletingId !== id) {
      setDeletingId(id);
      setTimeout(() => setDeletingId((cur) => (cur === id ? null : cur)), 2500);
      return;
    }
    try {
      await deleteHomework(id);
      setRows((r) => r.filter((h) => h.id !== id));
    } catch (e) {
      console.error("Failed to delete homework", e);
      setError(t("homework.deleteError"));
    } finally {
      setDeletingId(null);
    }
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(h: Homework) {
    setEditing(h);
    setFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">{t("nav.homework")}</h2>
          <p className="text-sm text-muted-foreground">{t("homework.subtitle")}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus />
          {t("homework.add")}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              {t("students.loading")}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
                <BookOpen className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">{t("homework.empty")}</p>
              <p className="text-xs text-muted-foreground">{t("homework.emptyHint")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-start font-medium">{t("homework.columns.title")}</th>
                    <th className="px-4 py-2.5 text-start font-medium">{t("homework.columns.group")}</th>
                    <th className="px-4 py-2.5 text-start font-medium">{t("homework.columns.dueDate")}</th>
                    <th className="px-4 py-2.5 text-start font-medium">{t("homework.columns.completion")}</th>
                    <th className="px-4 py-2.5 text-start font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((h) => (
                    <tr key={h.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-2.5 font-medium">{h.title}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{h.groupName ?? "—"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground" dir="ltr">
                        {h.dueDate ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-emerald-600"
                              style={{ width: `${h.completion}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground" dir="ltr">
                            {h.completion}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => setDetailId(h.id)}>
                            <Users />
                            <span className="sr-only">{t("homework.detail")}</span>
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(h)}>
                            <CalendarDays />
                            <span className="sr-only">{t("homework.edit")}</span>
                          </Button>
                          <Button
                            variant={deletingId === h.id ? "destructive" : "ghost"}
                            size="icon-sm"
                            aria-label={
                              deletingId === h.id
                                ? t("homework.confirmDelete")
                                : t("homework.delete")
                            }
                            onClick={() => void handleDelete(h.id)}
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

      <HomeworkFormDialog
        open={formOpen}
        homework={editing}
        groups={groups}
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
