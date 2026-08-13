import { saveFile } from "@/lib/export/save-file";
import { buildReportCardPdf } from "@/features/report-card/infrastructure/report-card-exporter";
import type { ReportCardPdfData } from "./report-card-pdf-data";

/** Export the report card PDF through the native save dialog. */
export async function exportReportCardPdf(data: ReportCardPdfData): Promise<void> {
  const bytes = await buildReportCardPdf(data);
  await saveFile("report-card.pdf", bytes, "PDF", "pdf");
}
