import { rgb, type Color, type PDFPage } from "pdf-lib";
import fontkit, { type Font } from "@pdf-lib/fontkit";
import fontUrl from "@/features/reports/assets/PakTypeNaskhBasic.ttf?url";
import { fitToWidth, shapeGlyphs, textWidth } from "@/features/reports/infrastructure/shape-text";

/**
 * Shared A4 PDF primitives for the feature exporters. All text is shaped
 * with fontkit (Arabic support) and drawn as vector paths — pdf-lib's own
 * drawText has no complex-script shaping. Layout constants and the palette
 * mirror the original report exporter so every PDF looks consistent.
 */

export const PAGE_WIDTH = 595;
export const PAGE_HEIGHT = 842;
export const PAGE_MARGIN = 40;

export const inkColor = rgb(0.12, 0.15, 0.2);
export const bodyColor = rgb(0.15, 0.15, 0.15);
export const mutedColor = rgb(0.4, 0.4, 0.4);
export const gridColor = rgb(0.85, 0.85, 0.85);
export const bandColor = rgb(0.93, 0.95, 0.97);

/** Load the embedded Arabic font (fontkit-shaped). */
export async function loadArabicFont(): Promise<Font> {
  const response = await fetch(fontUrl);
  const fontBuffer = new Uint8Array(await response.arrayBuffer());
  return fontkit.create(fontBuffer);
}

/**
 * Draw a shaped text run at pen position `x` (PDF points), baseline at `y`.
 * Glyphs advance left-to-right regardless of `rtl` because shapeGlyphs
 * already returned them in visual order.
 */
export function drawShapedText(
  page: PDFPage,
  font: Font,
  rtl: boolean,
  text: string,
  x: number,
  y: number,
  size: number,
  color: Color,
): void {
  const scale = size / font.unitsPerEm;
  let pen = x;
  for (const g of shapeGlyphs(font, text, rtl)) {
    // Shift by the mark offsets (already y-down paths, so +yOffset is up).
    page.drawSvgPath(g.d, { x: pen + g.xOffset * scale, y: y + g.yOffset * scale, scale, color });
    pen += g.advance * scale;
  }
}

/**
 * Fit `text` into `maxWidthPt` and draw it anchored at `edge` — the right
 * edge for RTL, the left edge for LTR (so RTL text is right-aligned).
 */
export function drawFittedText(
  page: PDFPage,
  font: Font,
  rtl: boolean,
  text: string,
  edge: number,
  y: number,
  size: number,
  color: Color,
  maxWidthPt: number,
): void {
  const fitted = fitToWidth(font, text, maxWidthPt * (font.unitsPerEm / size));
  const width = (textWidth(font, fitted) / font.unitsPerEm) * size;
  const x = rtl ? edge - width : edge;
  drawShapedText(page, font, rtl, fitted, x, y, size, color);
}