import { PDFDocument, type Color } from "pdf-lib";
import type { ReportData } from "@/features/reports/domain";
import { textWidth } from "@/features/reports/infrastructure/shape-text";
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

const TITLE_SIZE = 20;
const SUBTITLE_SIZE = 10;
const ROW_SIZE = 10;
const ROW_HEIGHT = 20;
const HEADER_HEIGHT = 24;
const LINE_HEIGHT = ROW_HEIGHT + 2;

/**
 * Export a report as a printable A4 PDF. All text is shaped with fontkit
 * (Arabic support) and drawn as vector paths; pdf-lib's own text drawing is
 * not used because it has no complex-script shaping. The whole table is laid
 * out right-to-left when `rtl` is true.
 */
export async function buildReportPdf(
  data: ReportData,
  opts: { rtl: boolean; subtitle: string },
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await loadArabicFont();

  // Column widths: proportional to the longest cell, capped at 40% of the page.
  // After capping the widths no longer sum to the table width, so they are
  // re-normalized to fill it exactly (avoids a gap at the far edge in RTL).
  const rtl = opts.rtl;
  const tableWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
  const widths = data.headers.map((h, i) => {
    let max = textWidth(font, h);
    for (const row of data.rows) {
      max = Math.max(max, textWidth(font, String(row[i])));
    }
    return max;
  });
  const total = widths.reduce((a, b) => a + b, 0);
  const capped =
    total > 0
      ? widths.map((w) => Math.min((w / total) * tableWidth, tableWidth * 0.4))
      : widths.map(() => tableWidth / widths.length || tableWidth);
  const cappedTotal = capped.reduce((a, b) => a + b, 0);
  const colWidths = capped.map((w) => (w / cappedTotal) * tableWidth);

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - PAGE_MARGIN;

  /** Draw a cell right-aligned in an RTL table, left-aligned otherwise. */
  function drawCell(text: string, colX: number, colW: number, color: Color) {
    drawFittedText(
      page,
      font,
      rtl,
      text,
      rtl ? colX + colW - 6 : colX + 6,
      y,
      ROW_SIZE,
      color,
      colW - 12,
    );
  }

  function drawHeaderRow() {
    y -= HEADER_HEIGHT + 4;
    let hx = opts.rtl ? PAGE_WIDTH - PAGE_MARGIN : PAGE_MARGIN;
    const headerBaseline = y + 16;
    data.headers.forEach((h, i) => {
      const colX = opts.rtl ? hx - colWidths[i] : hx;
      page.drawRectangle({
        x: colX,
        y,
        width: colWidths[i],
        height: HEADER_HEIGHT,
        color: bandColor,
      });
      const savedY = y;
      y = headerBaseline;
      drawCell(h, colX, colWidths[i], inkColor);
      y = savedY;
      hx += opts.rtl ? -colWidths[i] : colWidths[i];
    });
    y -= HEADER_HEIGHT;
  }

  function ensureSpace(needed: number) {
    if (y - needed < PAGE_MARGIN) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - PAGE_MARGIN;
      // Repeat the header row on every continuation page.
      drawHeaderRow();
    }
  }

  // Title + subtitle.
  y -= TITLE_SIZE + 6;
  drawFittedText(
    page,
    font,
    rtl,
    data.title,
    opts.rtl ? PAGE_WIDTH - PAGE_MARGIN : PAGE_MARGIN,
    y,
    TITLE_SIZE,
    inkColor,
    tableWidth,
  );
  y -= SUBTITLE_SIZE + 10;
  drawFittedText(
    page,
    font,
    rtl,
    opts.subtitle,
    opts.rtl ? PAGE_WIDTH - PAGE_MARGIN : PAGE_MARGIN,
    y,
    SUBTITLE_SIZE,
    mutedColor,
    tableWidth,
  );

  // Header row.
  drawHeaderRow();

  // Data rows.
  for (const row of data.rows) {
    ensureSpace(LINE_HEIGHT);
    const rowTop = y;
    let cx = opts.rtl ? PAGE_WIDTH - PAGE_MARGIN : PAGE_MARGIN;
    const savedY = y;
    y = rowTop + 15;
    row.forEach((cell, i) => {
      const colX = opts.rtl ? cx - colWidths[i] : cx;
      drawCell(String(cell), colX, colWidths[i], bodyColor);
      cx += opts.rtl ? -colWidths[i] : colWidths[i];
    });
    y = savedY;
    page.drawLine({
      start: { x: PAGE_MARGIN, y: rowTop },
      end: { x: PAGE_WIDTH - PAGE_MARGIN, y: rowTop },
      thickness: 0.5,
      color: gridColor,
    });
    y -= LINE_HEIGHT;
  }
  page.drawLine({
    start: { x: PAGE_MARGIN, y },
    end: { x: PAGE_WIDTH - PAGE_MARGIN, y },
    thickness: 0.5,
    color: gridColor,
  });

  return doc.save();
}
