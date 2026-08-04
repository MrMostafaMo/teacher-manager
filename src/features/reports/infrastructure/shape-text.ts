import type { Font } from "@pdf-lib/fontkit";

/**
 * Shape Arabic text for `page.drawSvgPath`. pdf-lib's drawText has no
 * complex-script shaping, so we use fontkit's `layout()` (which runs the
 * font's GSUB Arabic shaper) and return one glyph-local SVG path plus its
 * advance per glyph. The caller draws each glyph with drawSvgPath, advancing
 * the pen by `advance` (font units) between glyphs.
 *
 * layout() returns glyphs in visual order (right-to-left for Arabic), so a
 * caller starting the pen at the run's right edge gets correct RTL output.
 *
 * ponytail: mixed-script cells (Arabic + latin digits) render unidirectional;
 * fine for short table cells, not for full paragraphs.
 */
export interface ShapedGlyph {
  d: string;
  advance: number;
}

export function shapeGlyphs(font: Font, text: string): ShapedGlyph[] {
  const run = font.layout(text);
  return run.glyphs.map((glyph, i) => ({
    d: (glyph.path as { toSVG(): string }).toSVG(),
    advance: run.positions[i].xAdvance,
  }));
}

/** Width of a shaped text run in font units. */
export function textWidth(font: Font, text: string): number {
  const run = font.layout(text);
  return run.positions.reduce((a, p) => a + p.xAdvance, 0);
}

/** Shorten text so its shaped width fits `maxWidth` (font units). */
export function fitToWidth(font: Font, text: string, maxWidth: number): string {
  let t = text;
  while (t.length > 1 && textWidth(font, t) > maxWidth) {
    t = t.slice(0, -1);
  }
  return t;
}
