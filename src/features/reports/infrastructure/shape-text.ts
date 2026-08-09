import type { Font } from "@pdf-lib/fontkit";

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
 * fontkit's `layout()` returns glyphs in visual left-to-right order with
 * positive advances, and it reverses the whole string into that order whenever
 * the string contains Arabic — including any latin/digit runs in it. That is
 * correct for single-direction strings, but a mixed cell like
 * `"المجموع 45 جنيه"` would come back with the number reversed (`"54"`).
 *
 * To handle mixed-script cells, `resolveLevels` below computes per-character
 * embedding levels (a UAX #9 subset) and `splitRuns` groups them into maximal
 * runs of equal level. fontkit shapes each run whole (it reverses pure-Arabic
 * runs into visual order and keeps LTR runs as-is), so only the run order
 * needs deciding here: reversed for an RTL base, logical order for LTR. This
 * reproduces the browser's behaviour for the report's real cell shapes:
 *   - `"المجموع 45 جنيه"` keeps its digits in order (`45`, not `54`);
 *   - `"+20 100 123 4567"` mirrors the space-separated digit runs as units
 *     (`4567 123 100 20+`), so the phone reads correctly right-to-left;
 *   - `"15-03-2025"`, `"14:30"` and `"1,250 ج.م"` keep their familiar forms
 *     because the separators merge into the digit run (rule W4);
 *   - `"Group 1"` stays unchanged (rule W7 turns a digit following a letter
 *     into the letter's class, keeping the run contiguous).
 */

/** Hebrew, Arabic, Arabic Supplement and Arabic Extended-A. */
const RTL_RE = /[\u0590-\u08FF]/;
/** Latin (and other LTR) letters. */
const LETTER_RE = /[\p{L}]/u;
/** Digits: Latin, Arabic-Indic, extended Arabic-Indic. */
const DIGIT_RE = /[\p{N}]/u;
/** European/common separators that join two adjacent digit runs (rule W4). */
const SEPARATOR_RE = /[\u002B\u002D\u002C\u002E\u003A\u00B7\u2013\u2014]/;

/**
 * Directional classes used by the bidi resolution. Arabic letters are `AL`
 * (promoted to `R` before neutrals are resolved); `EN` may become `AN`
 * (rule W2) or `L` (rule W7).
 */
type BidiClass = "AL" | "R" | "L" | "EN" | "AN" | "N";

/** Run of one resolved embedding level (UAX #9). */
interface Run {
  text: string;
  level: number;
}

function bidiClass(ch: string): BidiClass {
  if (RTL_RE.test(ch)) return "AL";
  if (DIGIT_RE.test(ch)) return "EN";
  if (LETTER_RE.test(ch)) return "L";
  return "N";
}

/** Nearest strong (R/L/EN/AN) from `i` in `step` direction, or null at the edge. */
function nearestStrong(classes: BidiClass[], i: number, step: 1 | -1): BidiClass | null {
  for (let j = i + step; j >= 0 && j < classes.length; j += step) {
    const c = classes[j];
    if (c === "R" || c === "L" || c === "EN" || c === "AN") return c;
  }
  return null;
}

/**
 * Per-character embedding levels (UAX #9 subset for single-line cells):
 * W2 (EN after AL becomes AN), W3 (AL→R), W4 (a single separator between two
 * ENs joins the digit run), W7 (EN after L becomes L), then N1/N2 for
 * neutrals and simple level assignment. Base level is 1 for RTL, 0 for LTR.
 */
function resolveLevels(text: string, rtl: boolean): number[] {
  const chars = [...text];
  const cls = chars.map(bidiClass);
  const n = chars.length;
  const levels = new Array<number>(n);

  // W2: an EN whose nearest preceding strong (R/L/AL/EN) is AL becomes AN.
  const w2 = [...cls];
  let prevStrong: BidiClass | null = null;
  for (let i = 0; i < n; i++) {
    if (cls[i] === "EN" && prevStrong === "AL") w2[i] = "AN";
    if (cls[i] === "AL" || cls[i] === "L" || cls[i] === "EN") prevStrong = cls[i];
  }

  // W3 (AL→R) then W4: a single separator between two ENs joins the digit run.
  const w4 = w2.map((c) => (c === "AL" ? "R" : c));
  for (let i = 0; i < n; i++) {
    if (w4[i] === "N" && SEPARATOR_RE.test(chars[i]) && w4[i - 1] === "EN" && w4[i + 1] === "EN") {
      w4[i] = "EN";
    }
  }

  // W7: an EN whose nearest preceding strong (R/L/EN) is L becomes L.
  const w7 = [...w4];
  prevStrong = null;
  for (let i = 0; i < n; i++) {
    if (w7[i] === "EN" && prevStrong === "L") w7[i] = "L";
    if (w7[i] === "R" || w7[i] === "L" || w7[i] === "EN") prevStrong = w7[i];
  }

  // N1/N2 + level assignment. EN/AN act as R for neutrals (count as R-ish);
  // a neutral at the paragraph edge resolves against the base direction.
  const baseStrong: BidiClass = rtl ? "R" : "L";
  const rish = (c: BidiClass) => c === "R" || c === "EN" || c === "AN";
  for (let i = 0; i < n; i++) {
    const c = w7[i];
    if (c === "N") {
      const left = nearestStrong(w7, i, -1) ?? baseStrong;
      const right = nearestStrong(w7, i, 1) ?? baseStrong;
      if (rish(left) && rish(right)) levels[i] = 1;
      else if (!rish(left) && !rish(right)) levels[i] = rtl ? 2 : 0;
      else levels[i] = rtl ? 1 : 0;
    } else if (c === "R") {
      levels[i] = 1;
    } else if (c === "AN") {
      levels[i] = 2;
    } else {
      levels[i] = rtl ? 2 : 0; // L or EN
    }
  }
  return levels;
}

/**
 * Group the text into maximal runs of equal embedding level (UAX #9 "atoms").
 * Each run is shaped whole — fontkit reverses pure-Arabic runs into visual
 * order and keeps LTR runs as-is — so only the run order needs handling by
 * the caller (reverse for an RTL base, logical order for LTR).
 */
function splitRuns(text: string, rtl: boolean): Run[] {
  const levels = resolveLevels(text, rtl);
  const runs: Run[] = [];
  for (let i = 0; i < text.length; i++) {
    const last = runs[runs.length - 1];
    if (last && last.level === levels[i]) last.text += text[i];
    else runs.push({ text: text[i], level: levels[i] });
  }
  return runs;
}

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
