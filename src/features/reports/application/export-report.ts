import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import type { ReportData } from "@/features/reports/domain";

/**
 * Export a report to disk through the native save dialog. Returns true when
 * the user saved a file, false when they cancelled.
 */
async function saveBytes(
  defaultPath: string,
  bytes: Uint8Array,
  filters: { name: string; extensions: string[] },
) {
  const path = await save({ defaultPath, filters: [filters] });
  if (!path) return false;
  await writeFile(path, bytes);
  return true;
}

export async function exportReportExcel(data: ReportData): Promise<boolean> {
  const { buildReportExcel } = await import("@/features/reports/infrastructure/excel-exporter");
  return saveBytes(`${data.key}-report.xlsx`, new Uint8Array(buildReportExcel(data)), {
    name: "Excel",
    extensions: ["xlsx"],
  });
}

export async function exportReportPdf(
  data: ReportData,
  opts: { rtl: boolean; subtitle: string },
): Promise<boolean> {
  const { buildReportPdf } = await import("@/features/reports/infrastructure/pdf-exporter");
  const bytes = await buildReportPdf(data, opts);
  return saveBytes(`${data.key}-report.pdf`, bytes, { name: "PDF", extensions: ["pdf"] });
}
