import { PDFDocument, rgb } from "pdf-lib";
import {
  drawFittedText,
  loadArabicFont,
  inkColor,
  mutedColor,
  bodyColor,
} from "@/lib/export/pdf-kit";
import type { IdCardPdfData } from "../application/id-card-pdf-data";

// CR80 size: 3.375" x 2.125", converted to points (72 ppi)
// 3.375 * 72 = 243, 2.125 * 72 = 153
const CARD_WIDTH = 243;
const CARD_HEIGHT = 153;
const MARGIN = 12;

export async function buildIdCardPdf(data: IdCardPdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await loadArabicFont();
  const rtl = data.rtl;

  // Portrait mode: width=153, height=243, but let's do Landscape mode for ID cards
  const page = doc.addPage([CARD_WIDTH, CARD_HEIGHT]);
  
  // Background gradient/color block
  const primaryColor = rgb(0.3, 0.4, 0.8);
  page.drawRectangle({
    x: 0,
    y: CARD_HEIGHT - 35,
    width: CARD_WIDTH,
    height: 35,
    color: primaryColor,
  });

  const centerNameW = CARD_WIDTH - (MARGIN * 2);
  const left = rtl ? CARD_WIDTH - MARGIN : MARGIN;

  // Center Name (Header)
  drawFittedText(
    page,
    font,
    rtl,
    data.centerName,
    left,
    CARD_HEIGHT - 22,
    14,
    rgb(1, 1, 1),
    centerNameW
  );

  let y = CARD_HEIGHT - 60;
  
  // Student Name
  drawFittedText(page, font, rtl, data.studentName, left, y, 16, inkColor, centerNameW);
  y -= 20;

  const labelSize = 8;
  const valueSize = 9;
  const labelColor = mutedColor;
  const valueColor = bodyColor;
  
  const labelW = 50;
  const valueW = centerNameW - labelW - 5;
  const valueEdge = rtl ? left - labelW - 5 : MARGIN + labelW + 5;

  const row = (label: string, value: string) => {
    drawFittedText(page, font, rtl, label, left, y, labelSize, labelColor, labelW);
    drawFittedText(page, font, rtl, value, valueEdge, y, valueSize, valueColor, valueW);
    y -= 14;
  };

  row(data.labels.studentId, data.studentId);
  if (data.className) row(data.labels.class, data.className);
  if (data.studentPhone) row(data.labels.phone, data.studentPhone);
  if (data.enrolledDate) row(data.labels.enrolled, data.enrolledDate);

  // A subtle footer border
  page.drawLine({
    start: { x: 0, y: 0 },
    end: { x: CARD_WIDTH, y: 0 },
    thickness: 8,
    color: primaryColor,
  });

  return doc.save();
}
