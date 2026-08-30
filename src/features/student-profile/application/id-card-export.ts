import { saveFile } from "@/lib/export/save-file";
import type { IdCardPdfData } from "./id-card-pdf-data";

export async function exportIdCardPdf(data: IdCardPdfData): Promise<void> {
  const { buildIdCardPdf } = await import(
    "@/features/student-profile/infrastructure/id-card-exporter"
  );
  const bytes = await buildIdCardPdf(data);
  await saveFile(`id-card-${data.studentName}.pdf`, bytes, "PDF", "pdf");
}
