import { create } from "zustand";

/** Global UI state for the command palette (⌘K / Ctrl+K). */
interface CommandState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const useCommandStore = create<CommandState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
