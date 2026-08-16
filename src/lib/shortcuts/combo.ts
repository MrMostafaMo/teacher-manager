import type { ParsedCombo } from "./types";

const MODIFIERS = ["ctrl", "shift", "alt", "meta"] as const;
const MODIFIER_ORDER: Record<string, number> = {
  ctrl: 0, shift: 1, alt: 2, meta: 3,
};

export function parseCombo(combo: string): ParsedCombo {
  const parts = combo.toLowerCase().split("+");
  const parsed: ParsedCombo = {
    ctrl: false, shift: false, alt: false, meta: false, key: "",
  };
  for (const part of parts) {
    if (MODIFIERS.includes(part as (typeof MODIFIERS)[number])) {
      parsed[part as keyof Pick<ParsedCombo, "ctrl" | "shift" | "alt" | "meta">] = true;
    } else {
      parsed.key = part;
    }
  }
  return parsed;
}

export function formatCombo(combo: ParsedCombo, isMac = false): string {
  const mods: string[] = [];
  if (combo.ctrl) mods.push("Ctrl");
  if (combo.shift) mods.push("Shift");
  if (combo.alt) mods.push("Alt");
  if (combo.meta) mods.push(isMac ? "⌘" : "Meta");
  const key = combo.key.length === 1
    ? combo.key.toUpperCase()
    : combo.key;
  if (isMac && mods.length === 1 && mods[0] === "⌘") {
    return `⌘${key}`;
  }
  return [...mods, key].join("+");
}

export function comboKey(combo: ParsedCombo): string {
  const mods = MODIFIERS
    .filter((m) => combo[m as keyof Pick<ParsedCombo, "ctrl" | "shift" | "alt" | "meta">])
    .sort((a, b) => (MODIFIER_ORDER[a] ?? 0) - (MODIFIER_ORDER[b] ?? 0));
  return [...mods, combo.key].join("+");
}

export function matchCombo(combo: ParsedCombo, event: KeyboardEvent): boolean {
  return (
    combo.ctrl === event.ctrlKey &&
    combo.shift === event.shiftKey &&
    combo.alt === event.altKey &&
    combo.meta === event.metaKey &&
    combo.key === event.key.toLowerCase()
  );
}

export function isModifierOnly(combo: string): boolean {
  const parts = combo.toLowerCase().split("+").filter(Boolean);
  return parts.length > 0 && parts.every((p) =>
    MODIFIERS.includes(p as (typeof MODIFIERS)[number]),
  );
}

const KNOWN = new Set<string>(MODIFIERS);

export function validateCombo(combo: string): string | null {
  if (isModifierOnly(combo)) return "modifiers_only";
  const parts = combo.toLowerCase().split("+").filter(Boolean);
  const hasModifier = parts.some((p) => KNOWN.has(p));
  const nonModifiers = parts.filter((p) => !KNOWN.has(p));
  if (nonModifiers.length > 1) return "invalid_modifier";
  if (!hasModifier && nonModifiers[0]?.length === 1) return "needs_modifier";
  return null;
}
