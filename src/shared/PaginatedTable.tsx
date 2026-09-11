import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "./DataTable";

interface PaginatedTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string;
  ariaLabel?: string;
  pageSize?: number;
  /** Server mode: controlled page (0-based) + total count; rows = current page. */
  page?: number;
  total?: number;
  onPageChange?: (page: number) => void;
}

/**
 * Pagination over DataTable. Client mode slices `rows` in memory;
 * server mode (page/total/onPageChange) pages remotely-fetched slices.
 */
export function PaginatedTable<T>({
  columns,
  rows,
  getRowKey,
  ariaLabel,
  pageSize = 50,
  page: controlledPage,
  total: controlledTotal,
  onPageChange,
}: PaginatedTableProps<T>) {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const server = controlledTotal !== undefined && onPageChange !== undefined;
  const total = server ? controlledTotal : rows.length;
  const current = server ? (controlledPage ?? 0) : page;
  const go = server ? onPageChange : setPage;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safe = Math.min(Math.max(0, current), pages - 1);
  const visible = useMemo(
    () => (server ? rows : rows.slice(safe * pageSize, safe * pageSize + pageSize)),
    [rows, safe, pageSize, server],
  );
  if (total <= pageSize) {
    return <DataTable columns={columns} rows={rows} getRowKey={getRowKey} ariaLabel={ariaLabel} />;
  }
  return (
    <div className="space-y-2">
      <DataTable
        columns={columns}
        rows={visible}
        getRowKey={(r, i) => getRowKey(r, safe * pageSize + i)}
        ariaLabel={ariaLabel}
      />
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground border-t bg-muted/30 px-4 py-2 rounded-b-lg">
        <span dir="ltr">
          {total === 0 ? 0 : safe * pageSize + 1}–{Math.min(total, (safe + 1) * pageSize)} / {total}
        </span>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={safe === 0}
            onClick={() => go(safe - 1)}
            aria-label={t("common.previous")}
          >
            {t("common.previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={safe >= pages - 1}
            onClick={() => go(safe + 1)}
            aria-label={t("common.next")}
          >
            {t("common.next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
