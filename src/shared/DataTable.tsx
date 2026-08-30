import { memo, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  /** Header cell content (string or node). */
  header: ReactNode;
  /** Cell renderer for each row. */
  render: (row: T) => ReactNode;
  /** Extra classes for every <td> of this column. */
  className?: string;
  /** Extra classes for the <th>. */
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  /** Stable unique key per row. */
  getRowKey: (row: T, index: number) => string;
  className?: string;
  ariaLabel?: string;
}

// ponytail: add scope="col" and aria-busy/aria-live for skeleton state when a11y audit demands it.
function DataTableInner<T>({ columns, rows, getRowKey, className, ariaLabel }: DataTableProps<T>) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={ariaLabel ?? "data-table"}
      className={cn("group/table overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [scrollbar-width:thin]", className)}
    >
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-md shadow-sm">
          <tr className="border-b text-xs text-muted-foreground">
            {columns.map((col, i) => (
              <th
                key={i}
                scope="col"
                className={cn(
                  "px-4 py-3 text-start align-middle font-semibold",
                  col.headerClassName,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={getRowKey(row, i)}
              className="border-b transition-colors last:border-0 even:bg-muted/20 hover:bg-muted/40"
            >
              {columns.map((col, i) => (
                <td key={i} className={cn("px-4 py-3 align-middle", col.className)}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Memoized so tables only re-render when rows/columns actually change — callers
 * should keep `columns` and `getRowKey` stable (useMemo/useCallback) to benefit.
 */
export const DataTable = memo(DataTableInner) as typeof DataTableInner;
