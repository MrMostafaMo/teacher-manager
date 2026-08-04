import * as XLSX from "xlsx";
import type { ReportData } from "@/features/reports/domain";

/**
 * Export a report as a .xlsx workbook. Spreadsheet apps shape Arabic
 * natively; ponytail: sheet RTL flag (`!dir`) is not written by xlsx@0.18,
 * column widths are — re-add if RTL display order ever matters.
 */
export function buildReportExcel(data: ReportData): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows]);
  ws["!cols"] = data.headers.map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, data.key);
  return XLSX.write(wb, { bookType: "xlsx", type: "array" });
}
