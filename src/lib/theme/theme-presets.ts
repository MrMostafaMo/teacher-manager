/** Visual identity palette, orthogonal to the light/dark mode. */
export type ThemePreset =
  | "nile"
  | "warm"
  | "midnight"
  | "academy"
  | "forest"
  | "ocean"
  | "rose"
  | "slate"
  | "contrast";

export const DEFAULT_PRESET: ThemePreset = "nile";

const PRESETS: readonly ThemePreset[] = [
  "nile",
  "warm",
  "midnight",
  "academy",
  "forest",
  "ocean",
  "rose",
  "slate",
  "contrast",
];

/** Type guard for values read back from localStorage. */
export function isThemePreset(value: unknown): value is ThemePreset {
  return typeof value === "string" && (PRESETS as readonly string[]).includes(value);
}
