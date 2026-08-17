import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Plus, TriangleAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TableRowsSkeleton } from "@/shared/Skeletons";
import { PageHeader } from "@/shared/PageHeader";
import { EmptyState } from "@/shared/EmptyState";
import { useConfirmDelete } from "@/shared/useConfirmDelete";
import { useCollapsedSections } from "@/shared/useCollapsedSections";
import { buildSectionsByGroup } from "@/lib/build-grouped-sections";
import { toast } from "@/lib/toast-store";
import { notifyUndo } from "@/lib/undo-store";
import {
  removeWeakPoint,
  updateWeakPoint,
  type StudentWeakPoint,
} from "@/features/weak-points/application/weak-point-cases";
import {
  filterWeakPoints,
  type WeakPointStatusFilter,
} from "@/features/weak-points/application/weak-point-filter";
import { useWeakPointsPageData } from "./use-weak-points-data";
import { WeakPointsFilters } from "./weak-points-filters";
import { WeakPointsSections } from "./weak-points-sections";
import { WeakPointEntryDialog } from "./WeakPointEntryDialog";

export default function WeakPointsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { rows, students, names, groupsByStudent, loading, error, reload } = useWeakPointsPageData(
    t("weakPoints.loadError"),
  );
  const [status, setStatus] = useState<WeakPointStatusFilter>("all");
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StudentWeakPoint | null>(null);
  const { armed, request, clear } = useConfirmDelete();
  const { isCollapsed, toggle } = useCollapsedSections();

  const filtered = useMemo(
    () => filterWeakPoints(rows, status, query, (id) => names.get(id) ?? ""),
    [rows, status, query, names],
  );
  const grouped = useMemo(
    () => buildSectionsByGroup(filtered, (r) => groupsByStudent.get(r.studentId) ?? []),
    [filtered, groupsByStudent],
  );
  function handleToggleResolved(row: StudentWeakPoint) {
    void updateWeakPoint(row.id, {
      description: row.description,
      recordedOn: row.recordedOn,
      resolved: !row.resolved,
    })
      .then(reload)
      .catch(() => toast(t("weakPoints.saveError"), "error"));
  }
  function handleDelete(id: string) {
    const row = rows.find((r) => r.id === id);
    void removeWeakPoint(id)
      .then((undoId) => {
        if (undoId !== null && row) {
          notifyUndo(
            undoId,
            t("undo.deleted"),
            `${t("undo.weakPoint")}: ${row.description}`,
            t("undo.undo"),
          );
        }
        reload();
      })
      .catch(() => toast(t("weakPoints.deleteError"), "error"));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.weakPoints")}
        description={t("weakPoints.subtitle")}
        actions={
          <Button
            onClick={() => {
              clear();
              setEditing(null);
              setDialogOpen(true);
            }}
            disabled={students.length === 0}
          >
            <Plus className="size-4" />
            {t("weakPoints.record")}
          </Button>
        }
      />

      <WeakPointsFilters
        status={status}
        onStatusChange={setStatus}
        query={query}
        onQueryChange={setQuery}
      />

      {loading ? (
        <TableRowsSkeleton rows={8} cols={5} />
      ) : error ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={TriangleAlert}
              title={rows.length === 0 ? t("weakPoints.empty") : t("weakPoints.noResults")}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {t("weakPoints.summary", { count: filtered.length })}
          </p>
          <WeakPointsSections
            sections={grouped.sections}
            ungrouped={grouped.ungrouped}
            names={names}
            deletingId={armed}
            isCollapsed={isCollapsed}
            onToggle={toggle}
            onOpenProfile={(studentId) => navigate(`/students/${studentId}`)}
            onEdit={(row) => {
              clear();
              setEditing(row);
              setDialogOpen(true);
            }}
            onToggleResolved={handleToggleResolved}
            onDelete={(id) => {
              if (request(id)) handleDelete(id);
            }}
          />
        </>
      )}

      <WeakPointEntryDialog
        open={dialogOpen}
        students={students}
        editing={editing}
        onClose={() => setDialogOpen(false)}
        onChanged={reload}
      />
    </div>
  );
}
