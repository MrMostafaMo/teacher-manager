import { PDFDocument } from "pdf-lib";
import {
  PAGE_HEIGHT,
  PAGE_MARGIN,
  PAGE_WIDTH,
  bodyColor,
  drawFittedText,
  inkColor,
  loadArabicFont,
  mutedColor,
} from "@/lib/export/pdf-kit";
import type { ReportCardPdfData } from "../application/report-card-pdf-data";

const TITLE_SIZE = 20;
const NAME_SIZE = 14;
const LABEL_SIZE = 11;
const VALUE_SIZE = 11;
const FOOTER_SIZE = 10;
const ROW_HEIGHT = 24;
const LABEL_COL = 0.38;
const GAP = 12;

/**
 * Report card PDF — one A4 page: title, student name, meta rows, summary
 * rows, exam list, notes, footer. `ponytail:` fixed single page — the report
 * shows at most the latest exams and always fits, so there is no pagination.
 */
export async function buildReportCardPdf(data: ReportCardPdfData): Promise<Uint8Array> {
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

  const rule = () => {
    y -= 8;
    page.drawLine({
      start: { x: PAGE_MARGIN, y },
      end: { x: PAGE_WIDTH - PAGE_MARGIN, y },
      thickness: 0.8,
      color: inkColor,
    });
    y -= 14;
  };

  const row = (
    label: string,
    value: string,
    labelColor: typeof mutedColor,
    valueColor: typeof bodyColor,
  ) => {
    y -= 17;
    drawFittedText(page, font, rtl, label, left, y, LABEL_SIZE, labelColor, labelW);
    drawFittedText(page, font, rtl, value, valueEdge, y, VALUE_SIZE, valueColor, valueW);
    y -= ROW_HEIGHT - 17;
  };

  const sectionTitle = (text: string) => {
    y -= 14;
    drawFittedText(page, font, rtl, text, left, y, LABEL_SIZE, inkColor, tableWidth);
    y -= 10;
  };

  y -= TITLE_SIZE + 8;
  drawFittedText(page, font, rtl, data.title, left, y, TITLE_SIZE, inkColor, tableWidth);
  y -= NAME_SIZE + 10;
  drawFittedText(page, font, rtl, data.studentName, left, y, NAME_SIZE, inkColor, tableWidth);

  rule();
  row(data.groupLabel, data.groupValue, mutedColor, bodyColor);
  row(data.enrolledLabel, data.enrolledValue, mutedColor, bodyColor);
  rule();
  row(data.attendanceLabel, data.attendanceValue, mutedColor, inkColor);
  row(data.homeworkLabel, data.homeworkValue, mutedColor, inkColor);
  rule();
  sectionTitle(data.examTitle);
  if (data.examRows.length === 0) {
    row("", data.examEmpty, mutedColor, mutedColor);
  } else {
    for (const e of data.examRows) row(e.name, e.value, mutedColor, bodyColor);
  }
  rule();
  row(data.weakSkillsLabel, data.weakSkillsValue, mutedColor, bodyColor);
  row(data.notesLabel, data.notesValue, mutedColor, bodyColor);

  rule();
  y -= FOOTER_SIZE + 6;
  drawFittedText(page, font, rtl, data.footer, left, y, FOOTER_SIZE, mutedColor, tableWidth);

  return doc.save();
}
