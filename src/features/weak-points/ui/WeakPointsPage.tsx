import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, TriangleAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { TableRowsSkeleton } from "@/shared/Skeletons";
import { PageHeader } from "@/shared/PageHeader";
import { EmptyState } from "@/shared/EmptyState";
import { Avatar } from "@/shared/Avatar";
import { SearchInput } from "@/shared/SearchInput";
import { useConfirmDelete } from "@/shared/useConfirmDelete";
import { toast } from "@/lib/toast-store";
import { notifyUndo } from "@/lib/undo-store";
import {
  removeWeakPoint,
  updateWeakPoint,
  type StudentWeakPoint,
} from "@/features/weak-points/application/weak-point-cases";
import { filterWeakPoints, type WeakPointStatusFilter } from "@/features/weak-points/application/weak-point-filter";
import { useWeakPointsPageData } from "./use-weak-points-data";
import { WeakPointsTable } from "./weak-points-table";
import { WeakPointEntryDialog } from "./WeakPointEntryDialog";

export default function WeakPointsPage() {
  const { t } = useTranslation();
  const { rows, students, names, loading, error, reload } = useWeakPointsPageData(
    t("weakPoints.loadError"),
  );
  const [status, setStatus] = useState<WeakPointStatusFilter>("all");
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StudentWeakPoint | null>(null);
  const { armed, request, clear } = useConfirmDelete();

  const filtered = useMemo(
    () => filterWeakPoints(rows, status, query, (id) => names.get(id) ?? ""),
    [rows, status, query, names],
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

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={t("weakPoints.searchPlaceholder")}
          ariaLabel={t("weakPoints.searchPlaceholder")}
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as WeakPointStatusFilter)}
          aria-label={t("weakPoints.filterAll")}
          className="w-auto shrink-0"
        >
          <option value="all">{t("weakPoints.filterAll")}</option>
          <option value="active">{t("weakPoints.filterActive")}</option>
          <option value="resolved">{t("weakPoints.filterResolved")}</option>
        </Select>
      </div>

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
          <Card>
            <CardContent className="p-0">
              <WeakPointsTable
                rows={filtered}
                deletingId={armed}
                renderStudent={(r) => {
                  const name = names.get(r.studentId) ?? "—";
                  return (
                    <span className="flex items-center gap-2">
                      <Avatar name={name} className="size-6 text-xs" />
                      {name}
                    </span>
                  );
                }}
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
            </CardContent>
          </Card>
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