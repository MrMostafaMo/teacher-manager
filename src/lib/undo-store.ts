import { create } from "zustand";
import { useToastStore } from "@/lib/toast-store";

/**
 * In-memory undo stack for deletions. An entry expires after UNDO_TTL even if
 * its toast is still visible; undoing restores the captured rows then fires
 * the global data-changed event so the open page re-fetches.
 *
 * No persistence by design — an app restart is a clean slate.
 */

export const UNDO_TTL = 5_000;
export const MAX_UNDO_ENTRIES = 10;

/**
 * Fired after any undo so pages re-fetch. Lives here (lib layer) so GlobalDialogs
 * re-exports it — importing the UI constant from undo-store would create a cycle.
 */
export const DATA_CHANGED_EVENT = "tm:data-changed";

export interface UndoEntry {
  id: number;
  expiresAt: number;
  restore: () => Promise<void>;
}

let nextUndoId = 1;

interface UndoStore {
  entries: UndoEntry[];
  register: (restore: () => Promise<void>) => number;
  undo: (id: number) => Promise<void>;
  clear: (id: number) => void;
}

export const useUndoStore = create<UndoStore>((set, get) => ({
  entries: [],
  register: (restore) => {
    const id = nextUndoId++;
    const entry: UndoEntry = { id, expiresAt: Date.now() + UNDO_TTL, restore };
    set((state) => ({ entries: [...state.entries, entry].slice(-MAX_UNDO_ENTRIES) }));
    window.setTimeout(() => get().clear(id), UNDO_TTL);
    return id;
  },
  undo: async (id) => {
    const entry = get().entries.find((e) => e.id === id);
    if (!entry) return;
    await entry.restore();
    get().clear(id);
    window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
  },
  clear: (id) => set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),
}));

/** Register a restore action and return its id (non-React callers). */
export function registerUndo(restore: () => Promise<void>): number {
  return useUndoStore.getState().register(restore);
}

/** Push an "undo" toast whose action restores the entry (used by delete flows). */
export function notifyUndo(
  entryId: number,
  message: string,
  description: string,
  undoLabel: string,
): void {
  useToastStore.getState().push({
    variant: "info",
    message,
    description,
    duration: UNDO_TTL,
    action: {
      label: undoLabel,
      onPress: () => void useUndoStore.getState().undo(entryId),
    },
  });
}
