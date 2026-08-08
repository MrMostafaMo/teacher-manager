import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, CalendarDays, Plus, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CollapsibleSection } from "@/shared/CollapsibleSection";
import {
  deleteHomework,
  listHomeworks,
  type HomeworkListItem,
} from "@/features/homework/application/homework-cases";
import { listGroups } from "@/features/groups/application/group-cases";
import type { Homework, StudyGroup } from "@/lib/db/schema";
import { formatDateString } from "@/lib/utils/format";
import { HomeworkFormDialog } from "./HomeworkFormDialog";
import { HomeworkDetailDialog } from "./HomeworkDetailDialog";

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

  function openCreate(groupId?: string) {
    setEditing(null);
    setDefaultGroupId(groupId);
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
        <Button onClick={() => openCreate()}>
          <Plus />
          {t("homework.add")}
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
              <BookOpen className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">{t("homework.empty")}</p>
            <p className="text-xs text-muted-foreground">{t("homework.emptyHint")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const items = rows.filter((h) => h.groupId === g.id);
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
                    {t("homework.add")}
                  </Button>
                }
              >
                {items.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    {t("homework.sectionEmpty")}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="px-4 py-2.5 text-start font-medium">{t("homework.columns.title")}</th>
                          <th className="px-4 py-2.5 text-start font-medium">{t("homework.columns.dueDate")}</th>
                          <th className="px-4 py-2.5 text-start font-medium">{t("homework.columns.completion")}</th>
                          <th className="px-4 py-2.5 text-start font-medium" />
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((h) => (
                          <tr key={h.id} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="px-4 py-2.5 font-medium">{h.title}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground" dir="ltr">
                                  {formatDateString(h.dueDate)}
                                </span>
                                {h.overdue && (
                                  <Badge variant="destructive">{t("homework.statusOverdue")}</Badge>
                                )}
                              </div>
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
              </CollapsibleSection>
            );
          })}
        </div>
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
