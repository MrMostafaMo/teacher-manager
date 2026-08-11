import type { Font } from "@pdf-lib/fontkit";
import { splitRuns } from "./bidi-levels";

/**
 * Shape text for `page.drawSvgPath`. pdf-lib's drawText has no complex-script
 * shaping, so we use fontkit's `layout()` (which runs the font's GSUB Arabic
 * shaper) and return one glyph-local SVG path plus its advance per glyph. The
 * caller draws each glyph with drawSvgPath, advancing the pen by `advance`
 * (font units) between glyphs.
 *
 * fontkit paths are y-up (baseline at 0, glyphs rising toward the cap height),
 * but pdf-lib's drawSvgPath maps path y downward (it emits a `scale(s, -s)`
 * CTM), so every path here is pre-flipped to y-down. Without that flip the
 * whole report renders upside down. Combining marks (harakat/tanween) carry a
 * `xOffset`/`yOffset` from the shaping position; the caller shifts each glyph
 * by them so the mark lands above/below its base letter.
 *
 * Mixed-script ordering (e.g. `"المجموع 45 جنيه"`) is delegated to
 * `bidi-levels.ts`; see the UAX #9 subset documented there.
 */

export interface ShapedGlyph {
  d: string;
  advance: number;
  /** Horizontal offset of a combining mark from its base glyph (font units). */
  xOffset: number;
  /** Vertical offset of a combining mark from the baseline (font units). */
  yOffset: number;
}

/** fontkit's Path type is missing the `transform` method. */
interface FlipablePath {
  transform(m0: number, m1: number, m2: number, m3: number, m4: number, m5: number): FlipablePath;
  toSVG(): string;
}

/**
 * Shape `text` into per-glyph paths in visual left-to-right order.
 * `rtl` is the base direction of the surrounding table (Arabic reports are
 * RTL). For a single-direction string the output matches fontkit's layout
 * exactly; only mixed-script cells are re-ordered. Glyph paths are flipped to
 * y-down (see the module doc) and combining-mark offsets are exposed so the
 * caller can position them correctly.
 */
export function shapeGlyphs(font: Font, text: string, rtl = true): ShapedGlyph[] {
  const runs = splitRuns(text, rtl);
  const ordered = rtl ? [...runs].reverse() : runs;
  const out: ShapedGlyph[] = [];
  for (const run of ordered) {
    const shaped = font.layout(run.text);
    for (let i = 0; i < shaped.glyphs.length; i++) {
      const path = (shaped.glyphs[i].path as unknown as FlipablePath).transform(1, 0, 0, -1, 0, 0);
      const position = shaped.positions[i];
      out.push({
        d: path.toSVG(),
        advance: position.xAdvance,
        xOffset: position.xOffset,
        yOffset: position.yOffset,
      });
    }
  }
  return out;
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
