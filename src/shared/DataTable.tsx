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
}

function DataTableInner<T>({
  columns,
  rows,
  getRowKey,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            {columns.map((col, i) => (
              <th
                key={i}
                className={cn("px-4 py-2.5 text-start font-medium", col.headerClassName)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={getRowKey(row, i)} className="border-b last:border-0 hover:bg-muted/50">
              {columns.map((col, i) => (
                <td key={i} className={cn("px-4 py-2.5", col.className)}>
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
