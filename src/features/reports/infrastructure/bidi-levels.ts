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
export interface Run {
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
export function splitRuns(text: string, rtl: boolean): Run[] {
  const levels = resolveLevels(text, rtl);
  const runs: Run[] = [];
  for (let i = 0; i < text.length; i++) {
    const last = runs[runs.length - 1];
    if (last && last.level === levels[i]) last.text += text[i];
    else runs.push({ text: text[i], level: levels[i] });
  }
  return runs;
}
