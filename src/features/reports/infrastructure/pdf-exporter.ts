import { PDFDocument, rgb, type Color } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fontUrl from "@/features/reports/assets/PakTypeNaskhBasic.ttf?url";
import type { ReportData } from "@/features/reports/domain";
import { fitToWidth, shapeGlyphs, textWidth } from "@/features/reports/infrastructure/shape-text";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 40;
const TITLE_SIZE = 20;
const SUBTITLE_SIZE = 10;
const ROW_SIZE = 10;
const ROW_HEIGHT = 20;
const HEADER_HEIGHT = 24;
const LINE_HEIGHT = ROW_HEIGHT + 2;

const headerColor = rgb(0.12, 0.15, 0.2);
const rowColor = rgb(0.15, 0.15, 0.15);
const mutedColor = rgb(0.4, 0.4, 0.4);
const gridColor = rgb(0.85, 0.85, 0.85);

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
  const response = await fetch(fontUrl);
  const fontBuffer = new Uint8Array(await response.arrayBuffer());
  const font = fontkit.create(fontBuffer);

  // Column widths: proportional to the longest cell, capped at 40% of the page.
  // After capping the widths no longer sum to the table width, so they are
  // re-normalized to fill it exactly (avoids a gap at the far edge in RTL).
  const rtl = opts.rtl;
  const tableWidth = PAGE_WIDTH - MARGIN * 2;
  const widths = data.headers.map((h, i) => {
    let max = textWidth(font, h);
    for (const row of data.rows) {
      max = Math.max(max, textWidth(font, String(row[i])));
    }
    return max;
  });
  const total = widths.reduce((a, b) => a + b, 0);
  const capped = total > 0 ? widths.map((w) => Math.min((w / total) * tableWidth, tableWidth * 0.4)) : widths.map(() => tableWidth / widths.length || tableWidth);
  const cappedTotal = capped.reduce((a, b) => a + b, 0);
  const colWidths = capped.map((w) => (w / cappedTotal) * tableWidth);

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  function drawHeaderRow() {
    y -= HEADER_HEIGHT + 4;
    let hx = opts.rtl ? PAGE_WIDTH - MARGIN : MARGIN;
    const headerBaseline = y + 16;
    data.headers.forEach((h, i) => {
      const colX = opts.rtl ? hx - colWidths[i] : hx;
      page.drawRectangle({ x: colX, y, width: colWidths[i], height: HEADER_HEIGHT, color: rgb(0.93, 0.95, 0.97) });
      const savedY = y;
      y = headerBaseline;
      cellText(h, colX, colWidths[i], headerColor);
      y = savedY;
      hx += opts.rtl ? -colWidths[i] : colWidths[i];
    });
    y -= HEADER_HEIGHT;
  }

  function ensureSpace(needed: number) {
    if (y - needed < MARGIN) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
      // Repeat the header row on every continuation page.
      drawHeaderRow();
    }
  }

  /** Draw a text run at pen position `px` (font-size units, unscaled). */
  function drawText(text: string, px: number, size: number, color: Color) {
    const scale = size / font.unitsPerEm;
    let pen = px;
    for (const g of shapeGlyphs(font, text, rtl)) {
      // Shift by the mark offsets (already y-down paths, so +yOffset is up).
      page.drawSvgPath(g.d, { x: pen + g.xOffset * scale, y: y + g.yOffset * scale, scale, color });
      pen += g.advance * scale;
    }
  }

  function drawTitle(text: string, edge: number, size: number, color: Color) {
    const fit = fitToWidth(font, text, tableWidth * (font.unitsPerEm / size));
    const scaled = textWidth(font, fit) / font.unitsPerEm * size;
    // `edge` is the right edge for RTL, the left edge for LTR.
    const px = opts.rtl ? edge - scaled : edge;
    drawText(fit, px, size, color);
  }

  /** Draw a cell right-aligned in an RTL table, left-aligned otherwise. */
  function cellText(text: string, colX: number, colW: number, color: Color) {
    const max = (colW - 12) * (font.unitsPerEm / ROW_SIZE);
    const fitted = fitToWidth(font, text, max);
    const w = textWidth(font, fitted) / font.unitsPerEm * ROW_SIZE;
    const px = opts.rtl ? colX + colW - 6 - w : colX + 6;
    drawText(fitted, px, ROW_SIZE, color);
  }

  // Title + subtitle.
  y -= TITLE_SIZE + 6;
  drawTitle(data.title, opts.rtl ? PAGE_WIDTH - MARGIN : MARGIN, TITLE_SIZE, headerColor);
  y -= SUBTITLE_SIZE + 10;
  drawTitle(opts.subtitle, opts.rtl ? PAGE_WIDTH - MARGIN : MARGIN, SUBTITLE_SIZE, mutedColor);

  // Header row.
  drawHeaderRow();

  // Data rows.
  for (const row of data.rows) {
    ensureSpace(LINE_HEIGHT);
    const rowTop = y;
    let cx = opts.rtl ? PAGE_WIDTH - MARGIN : MARGIN;
    const savedY = y;
    y = rowTop + 15;
    row.forEach((cell, i) => {
      const colX = opts.rtl ? cx - colWidths[i] : cx;
      cellText(String(cell), colX, colWidths[i], rowColor);
      cx += opts.rtl ? -colWidths[i] : colWidths[i];
    });
    y = savedY;
    page.drawLine({ start: { x: MARGIN, y: rowTop }, end: { x: PAGE_WIDTH - MARGIN, y: rowTop }, thickness: 0.5, color: gridColor });
    y -= LINE_HEIGHT;
  }
  page.drawLine({ start: { x: MARGIN, y: y }, end: { x: PAGE_WIDTH - MARGIN, y: y }, thickness: 0.5, color: gridColor });

  return doc.save();
}
