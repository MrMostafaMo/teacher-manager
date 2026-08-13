import { PDFDocument } from "pdf-lib";
import {
  PAGE_HEIGHT,
  PAGE_MARGIN,
  PAGE_WIDTH,
  bandColor,
  bodyColor,
  drawFittedText,
  gridColor,
  inkColor,
  loadArabicFont,
  mutedColor,
} from "@/lib/export/pdf-kit";
import type { ReceiptLine } from "@/features/payments/application/receipt-rows";

/**
 * Payment receipt PDF — a single A4 page with the receipt's label/value rows.
 * The amount row is drawn on a band and sized up. `ponytail:` fixed single
 * page: the 7 rows always fit alongside the title and footer, so there is no
 * pagination path.
 */

export interface ReceiptPdfData {
  title: string;
  footer: string;
  rtl: boolean;
  lines: ReceiptLine[];
}

const TITLE_SIZE = 20;
const LABEL_SIZE = 11;
const VALUE_SIZE = 11;
const HIGHLIGHT_SIZE = 14;
const FOOTER_SIZE = 10;
const ROW_HEIGHT = 26;
const LABEL_COL = 0.4;
const GAP = 12;

export async function buildReceiptPdf(data: ReceiptPdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await loadArabicFont();
  const rtl = data.rtl;
  const tableWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
  const labelW = tableWidth * LABEL_COL;
  const valueW = tableWidth - labelW - GAP;
  const left = rtl ? PAGE_WIDTH - PAGE_MARGIN : PAGE_MARGIN;
  const valueEdge = rtl ? left - labelW - GAP : PAGE_MARGIN + labelW + GAP;

  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - PAGE_MARGIN;

  y -= TITLE_SIZE + 8;
  drawFittedText(page, font, rtl, data.title, left, y, TITLE_SIZE, inkColor, tableWidth);
  y -= 14;
  page.drawLine({ start: { x: PAGE_MARGIN, y }, end: { x: PAGE_WIDTH - PAGE_MARGIN, y }, thickness: 0.8, color: inkColor });

  for (const line of data.lines) {
    const rowTop = y;
    if (line.highlight) {
      page.drawRectangle({ x: PAGE_MARGIN, y: rowTop - 2, width: tableWidth, height: ROW_HEIGHT + 2, color: bandColor });
    }
    y = rowTop + 17;
    drawFittedText(page, font, rtl, line.label, left, y, LABEL_SIZE, line.highlight ? inkColor : mutedColor, labelW);
    drawFittedText(page, font, rtl, line.value, valueEdge, y, line.highlight ? HIGHLIGHT_SIZE : VALUE_SIZE, line.highlight ? inkColor : bodyColor, valueW);
    y = rowTop - ROW_HEIGHT;
    page.drawLine({ start: { x: PAGE_MARGIN, y: rowTop }, end: { x: PAGE_WIDTH - PAGE_MARGIN, y: rowTop }, thickness: 0.5, color: gridColor });
  }

  y -= 18;
  page.drawLine({ start: { x: PAGE_MARGIN, y }, end: { x: PAGE_WIDTH - PAGE_MARGIN, y }, thickness: 0.8, color: inkColor });
  y -= FOOTER_SIZE + 8;
  drawFittedText(page, font, rtl, data.footer, left, y, FOOTER_SIZE, mutedColor, tableWidth);

  return doc.save();
}
