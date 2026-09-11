import { shimStore } from "@/lib/settings/settings-store";
import { getDefaultShortcut, mergeShortcuts } from "@/lib/settings/settings-shortcuts";
import type { ShortcutActionId } from "./types";

export type ShortcutsMap = Record<ShortcutActionId, string>;

export interface ShortcutsState {
  shortcuts: ShortcutsMap;
  setShortcut: (id: ShortcutActionId, combo: string) => void;
  resetShortcut: (id: ShortcutActionId) => void;
  resetShortcuts: () => void;
  getDefault: (id: ShortcutActionId) => string | undefined;
  findDuplicate: (selfId: ShortcutActionId, combo: string) => ShortcutActionId | undefined;
}

/** Compatibility shim over the unified settings store (one release). */
export const useShortcutsStore = shimStore<ShortcutsState>((s) => ({
  shortcuts: s.shortcuts as ShortcutsMap,
  setShortcut: s.setShortcut,
  resetShortcut: s.resetShortcut,
  resetShortcuts: s.resetShortcuts,
  getDefault: s.getDefault,
  findDuplicate: s.findDuplicate,
}));

export { getDefaultShortcut, mergeShortcuts };
