import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type DataTableColumn } from "@/shared/DataTable";
import type { ReportData, ReportKey } from "@/features/reports/domain";
import { formatMoney } from "@/lib/utils/format";

/** Column indexes that hold EGP amounts per report key (0-based). */
export const MONEY_COLUMNS: Partial<Record<ReportKey, number[]>> = {
  payments: [1, 2, 3],
  expenses: [3],
  finances: [1, 2, 3],
};

export function useReportColumns(
  data: ReportData | null,
  key: ReportKey,
): DataTableColumn<(string | number)[]>[] {
  const { t } = useTranslation();
  return useMemo(() => {
    if (!data) return [];
    return data.headers.map((h, j): DataTableColumn<(string | number)[]> => ({
      header: h,
      className: "whitespace-nowrap",
      render: (row) =>
        typeof row[j] === "number" && MONEY_COLUMNS[key]?.includes(j)
          ? formatMoney(row[j] as number)
          : String(row[j]),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, key, t]);
}

export function ReportExportActions({
  data,
  exporting,
  onExport,
}: {
  data: ReportData | null;
  exporting: "excel" | "pdf" | null;
  onExport: (kind: "excel" | "pdf") => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Button
        variant="outline"
        onClick={() => onExport("excel")}
        disabled={!data || exporting !== null}
      >
        <FileSpreadsheet />
        {exporting === "excel" ? t("reports.exporting") : t("reports.exportExcel")}
      </Button>
      <Button onClick={() => onExport("pdf")} disabled={!data || exporting !== null}>
        <FileText />
        {exporting === "pdf" ? t("reports.exporting") : t("reports.exportPdf")}
      </Button>
    </>
  );
}
