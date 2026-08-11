import { memo, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { StudentMonthlyRow } from "@/features/attendance/application/attendance-cases";
import { formatPercent } from "@/lib/utils/format";
import { DataTable, type DataTableColumn } from "@/shared/DataTable";

export const MonthlySummaryTable = memo(function MonthlySummaryTable({
  list,
  groupLabel,
}: {
  list: StudentMonthlyRow[];
  groupLabel: string;
}) {
  const { t } = useTranslation();
  const columns = useMemo<DataTableColumn<StudentMonthlyRow>[]>(
    () => [
      {
        header: t("attendance.columns.student"),
        render: (r) => (
          <>
            <p className="font-medium">{r.name}</p>
            <p className="text-xs text-muted-foreground">{groupLabel}</p>
          </>
        ),
      },
      {
        header: t("attendance.columns.present"),
        className: "tabular-nums text-success",
        render: (r) => r.present,
      },
      {
        header: t("attendance.columns.absent"),
        className: "tabular-nums text-destructive",
        render: (r) => r.absent,
      },
      {
        header: t("attendance.columns.late"),
        className: "tabular-nums text-warning",
        render: (r) => r.late,
      },
      {
        header: t("attendance.columns.excused"),
        className: "tabular-nums text-(--chart-5)",
        render: (r) => r.excused,
      },
      {
        header: t("attendance.columns.percentage"),
        className: "text-muted-foreground",
        render: (r) => {
          const total = r.present + r.absent + r.late + r.excused;
          return total > 0 ? formatPercent((r.present + r.late + r.excused) / total) : "—";
        },
      },
    ],
    [t, groupLabel],
  );
  const getRowKey = useCallback((r: StudentMonthlyRow) => r.studentId, []);
  return (
    <DataTable<StudentMonthlyRow> columns={columns} rows={list} getRowKey={getRowKey} />
  );
});
