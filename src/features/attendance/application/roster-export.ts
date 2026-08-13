import { buildRosterPdf, type RosterPdfData } from "@/features/attendance/infrastructure/roster-exporter";
import { saveFile } from "@/lib/export/save-file";

/**
 * Export a day's attendance roster through the native save dialog.
 * Returns true when the user saved the PDF, false when they cancelled.
 */
export async function exportRosterPdf(data: RosterPdfData): Promise<boolean> {
  const bytes = await buildRosterPdf(data);
  return saveFile("attendance-roster.pdf", bytes, "PDF", "pdf");
}