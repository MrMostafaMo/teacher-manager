import { DEFAULT_SHORTCUTS, SHORTCUT_IDS } from "@/lib/shortcuts/defaults";
import { comboKey, parseCombo } from "@/lib/shortcuts/combo";
import type { ShortcutActionId } from "@/lib/shortcuts/types";

/** Full default map (kept in sync with the shortcuts feature). */
export function shortcutDefaults(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const d of DEFAULT_SHORTCUTS) map[d.id] = d.defaultCombo;
  return map;
}

/** Default combo for one action (new defaults survive old persists). */
export function getDefaultShortcut(id: ShortcutActionId): string | undefined {
  return DEFAULT_SHORTCUTS.find((d) => d.id === id)?.defaultCombo;
}

/** Effective shortcuts: saved overrides over current defaults. */
export function mergeShortcuts(saved?: Record<string, string>): Record<string, string> {
  return { ...shortcutDefaults(), ...(saved ?? {}) };
}

export function findDuplicateShortcut(
  shortcuts: Record<string, string>,
  selfId: ShortcutActionId,
  combo: string,
): ShortcutActionId | undefined {
  const target = comboKey(parseCombo(combo));
  for (const key of SHORTCUT_IDS) {
    if (key === selfId) continue;
    const cur = shortcuts[key] ?? getDefaultShortcut(key) ?? "";
    if (comboKey(parseCombo(cur)) === target) return key;
  }
  return undefined;
}
