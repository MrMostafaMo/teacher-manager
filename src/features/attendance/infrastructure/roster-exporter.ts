import { PDFDocument, type Color } from "pdf-lib";
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

/**
 * Attendance roster PDF. One row per student: name + status, right-aligned
 * when `rtl`. Status values arrive already localized by the caller.
 */

export interface RosterRow {
  name: string;
  status: string;
}

export interface RosterPdfData {
  title: string;
  subtitle: string;
  rtl: boolean;
  nameHeader: string;
  statusHeader: string;
  rows: RosterRow[];
}

const TITLE_SIZE = 18;
const SUBTITLE_SIZE = 10;
const ROW_SIZE = 11;
const HEADER_HEIGHT = 24;
const ROW_HEIGHT = 22;
const LINE_HEIGHT = ROW_HEIGHT + 2;

export async function buildRosterPdf(data: RosterPdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await loadArabicFont();
  const rtl = data.rtl;
  const tableWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
  const nameW = tableWidth * 0.62;
  const statusW = tableWidth - nameW;

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
    let hx = rtl ? PAGE_WIDTH - PAGE_MARGIN : PAGE_MARGIN;
    const headerBaseline = y + 16;
    const headers = [
      { text: data.nameHeader, w: nameW },
      { text: data.statusHeader, w: statusW },
    ];
    for (const h of headers) {
      const colX = rtl ? hx - h.w : hx;
      page.drawRectangle({ x: colX, y, width: h.w, height: HEADER_HEIGHT, color: bandColor });
      const savedY = y;
      y = headerBaseline;
      drawCell(h.text, colX, h.w, inkColor);
      y = savedY;
      hx += rtl ? -h.w : h.w;
    }
    y -= HEADER_HEIGHT;
  }

  function ensureSpace(needed: number) {
    if (y - needed < PAGE_MARGIN) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - PAGE_MARGIN;
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
    rtl ? PAGE_WIDTH - PAGE_MARGIN : PAGE_MARGIN,
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
    data.subtitle,
    rtl ? PAGE_WIDTH - PAGE_MARGIN : PAGE_MARGIN,
    y,
    SUBTITLE_SIZE,
    mutedColor,
    tableWidth,
  );

  drawHeaderRow();

  // Rows.
  const cells: Array<[string, number]> = [
    ["name", nameW],
    ["status", statusW],
  ];
  for (const row of data.rows) {
    ensureSpace(LINE_HEIGHT);
    const rowTop = y;
    let cx = rtl ? PAGE_WIDTH - PAGE_MARGIN : PAGE_MARGIN;
    const savedY = y;
    y = rowTop + 15;
    cells.forEach(([key, w]) => {
      const colX = rtl ? cx - w : cx;
      drawCell(row[key as keyof RosterRow], colX, w, bodyColor);
      cx += rtl ? -w : w;
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
