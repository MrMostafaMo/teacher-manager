import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_SHORTCUTS, SHORTCUT_IDS } from "./defaults";
import { comboKey, parseCombo } from "./combo";
import type { ShortcutActionId } from "./types";

const STORAGE_KEY = "tm-shortcuts";

type ShortcutsMap = Record<ShortcutActionId, string>;

interface ShortcutsState {
  shortcuts: ShortcutsMap;
  setShortcut: (id: ShortcutActionId, combo: string) => void;
  resetShortcut: (id: ShortcutActionId) => void;
  resetShortcuts: () => void;
  getDefault: (id: ShortcutActionId) => string | undefined;
  findDuplicate: (selfId: ShortcutActionId, combo: string) => ShortcutActionId | undefined;
}

function buildDefaults(): ShortcutsMap {
  const map: ShortcutsMap = {} as ShortcutsMap;
  for (const d of DEFAULT_SHORTCUTS) {
    map[d.id] = d.defaultCombo;
  }
  return map;
}

export const useShortcutsStore = create<ShortcutsState>()(
  persist(
    (set, get) => ({
      shortcuts: buildDefaults(),

      setShortcut: (id, combo) => set((s) => ({ shortcuts: { ...s.shortcuts, [id]: combo } })),

      resetShortcut: (id) =>
        set((s) => ({
          shortcuts: {
            ...s.shortcuts,
            [id]: DEFAULT_SHORTCUTS.find((d) => d.id === id)?.defaultCombo ?? "",
          },
        })),

      resetShortcuts: () => set({ shortcuts: buildDefaults() }),

      getDefault: (id) => DEFAULT_SHORTCUTS.find((d) => d.id === id)?.defaultCombo,

      findDuplicate: (selfId, combo) => {
        const map = get().shortcuts;
        const target = comboKey(parseCombo(combo));
        for (const key of SHORTCUT_IDS) {
          if (key === selfId) continue;
          if (comboKey(parseCombo(map[key])) === target) return key;
        }
        return undefined;
      },
    }),
    {
      name: STORAGE_KEY,
      merge: (persisted, current) => {
        const saved = persisted as Partial<ShortcutsState> | null;
        return {
          ...current,
          shortcuts: { ...current.shortcuts, ...saved?.shortcuts },
        };
      },
    },
  ),
);
