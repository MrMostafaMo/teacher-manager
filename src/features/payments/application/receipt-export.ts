import { saveFile } from "@/lib/export/save-file";
import type { ReceiptPdfData } from "@/features/payments/infrastructure/receipt-exporter";

/** Export the receipt PDF through the native save dialog. */
export async function exportReceiptPdf(data: ReceiptPdfData): Promise<void> {
  const { buildReceiptPdf } = await import(
    "@/features/payments/infrastructure/receipt-exporter"
  );
  const bytes = await buildReceiptPdf(data);
  await saveFile("payment-receipt.pdf", bytes, "PDF", "pdf");
}
