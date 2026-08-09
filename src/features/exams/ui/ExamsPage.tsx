import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ClipboardList, PencilLine, Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CollapsibleSection } from "@/shared/CollapsibleSection";
import { TableRowsSkeleton } from "@/shared/Skeletons";
import { PageHeader } from "@/shared/PageHeader";
import { EmptyState } from "@/shared/EmptyState";
import { DataTable, type DataTableColumn } from "@/shared/DataTable";
import { deleteExam, listExams, type ExamListItem } from "@/features/exams/application/exam-cases";
import { listGroups } from "@/features/groups/application/group-cases";
import type { Exam, StudyGroup } from "@/lib/db/schema";
import { formatDateString } from "@/lib/utils/format";
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

  const columns: DataTableColumn<ExamListItem>[] = [
    {
      header: t("exams.columns.title"),
      className: "font-medium",
      render: (e) => e.title,
    },
    {
      header: t("exams.columns.date"),
      className: "text-muted-foreground tabular-nums",
      render: (e) => <span dir="ltr">{formatDateString(e.date)}</span>,
    },
    {
      header: t("exams.columns.maxScore"),
      className: "text-muted-foreground tabular-nums",
      render: (e) => <span dir="ltr">{e.maxScore}</span>,
    },
    {
      header: t("exams.columns.completion"),
      render: (e) => (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-success"
              style={{ width: `${e.completion}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums" dir="ltr">
            {e.completion}%
          </span>
        </div>
      ),
    },
    {
      header: t("exams.columns.average"),
      className: "text-muted-foreground tabular-nums",
      render: (e) => <span dir="ltr">{e.average ?? "—"}</span>,
    },
    {
      header: "",
      className: "text-end",
      headerClassName: "text-end",
      render: (e) => (
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
            aria-label={deletingId === e.id ? t("exams.confirmDelete") : t("exams.delete")}
            onClick={() => void handleDelete(e.id)}
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
            <EmptyState icon={ClipboardList} title={t("exams.empty")} description={t("exams.emptyHint")} />
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
                  <DataTable<ExamListItem>
                    columns={columns}
                    rows={items}
                    getRowKey={(e) => e.id}
                  />
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
