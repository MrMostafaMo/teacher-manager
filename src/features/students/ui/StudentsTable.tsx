import { memo, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Eye, Pencil, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Student } from "@/lib/db/schema";
import { DataTable, type DataTableColumn } from "@/shared/DataTable";
import { Avatar } from "@/shared/Avatar";
import { ConfirmDeleteButton } from "@/shared/ConfirmDeleteButton";
import { EmptyState } from "@/shared/EmptyState";
import { StatusBadge } from "./StatusBadge";

export const StudentsTable = memo(function StudentsTable({
  list,
  deletingId,
  selectedIds,
  onOpen,
  onDelete,
  onToggle,
  onToggleAll,
}: {
  list: Student[];
  deletingId: string | null;
  selectedIds: Set<string>;
  onOpen: (student: Student) => void;
  onDelete: (student: Student) => void;
  onToggle: (id: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const allSelected = list.length > 0 && list.every((s) => selectedIds.has(s.id));
  const someSelected = list.some((s) => selectedIds.has(s.id));

  const columns = useMemo<DataTableColumn<Student>[]>(
    () => [
      {
        header: (
          <input
            type="checkbox"
            className="rounded border-input text-primary focus:ring-primary size-4"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected && !allSelected;
            }}
            onChange={(e) => onToggleAll(e.target.checked)}
          />
        ),
        className: "w-8",
        headerClassName: "w-8",
        render: (s) => (
          <input
            type="checkbox"
            className="rounded border-input text-primary focus:ring-primary size-4"
            checked={selectedIds.has(s.id)}
            onChange={(e) => onToggle(s.id, e.target.checked)}
          />
        ),
      },
      {
        header: t("students.columns.name"),
        render: (s) => (
          <span className="flex items-center gap-2.5">
            <Avatar name={s.name} className="size-8 text-xs" />
            <Button
              variant="ghost"
              className="h-auto px-0 py-0 font-medium"
              title={t("students.profile")}
              onClick={() => navigate(`/students/${s.id}`)}
            >
              {s.name}
            </Button>
          </span>
        ),
      },
      {
        header: t("students.columns.guardian"),
        className: "text-muted-foreground",
        render: (s) => s.guardianName ?? "—",
      },
      {
        header: t("students.columns.phone"),
        className: "text-muted-foreground",
        render: (s) => <span dir="ltr">{s.phone ?? "—"}</span>,
      },
      {
        header: t("students.columns.gradeLevel"),
        className: "text-muted-foreground",
        render: (s) => s.gradeLevel ?? "—",
      },
      {
        header: t("students.columns.status"),
        render: (s) => <StatusBadge status={s.status} />,
      },
      {
        header: "",
        className: "text-end",
        headerClassName: "text-end",
        render: (s) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("students.view")}
              title={t("students.profile")}
              onClick={() => navigate(`/students/${s.id}`)}
            >
              <Eye />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("students.edit")}
              onClick={() => onOpen(s)}
            >
              <Pencil />
            </Button>
            <ConfirmDeleteButton
              armed={deletingId === s.id}
              deleteLabel={t("students.delete")}
              confirmLabel={t("students.confirmDelete")}
              onDelete={() => void onDelete(s)}
            />
          </div>
        ),
      },
    ],
    [t, navigate, deletingId, onOpen, onDelete, selectedIds, allSelected, someSelected, onToggle, onToggleAll],
  );
  const getRowKey = useCallback((s: Student) => s.id, []);
  return <DataTable<Student> columns={columns} rows={list} getRowKey={getRowKey} />;
});

export function StudentsEmpty({ hasFilters }: { hasFilters: boolean }) {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={Users}
      title={hasFilters ? t("students.noResults") : t("students.empty")}
      description={hasFilters ? undefined : t("students.emptyHint")}
    />
  );
}
