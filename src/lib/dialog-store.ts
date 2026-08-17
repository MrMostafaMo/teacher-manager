import { create } from "zustand";

/** Dialogs that can be opened from anywhere (command palette, quick actions). */
export type GlobalDialogId =
  "student" | "payment" | "expense" | "group" | "schedule" | "homework" | "exam" | "skill";

interface DialogState {
  dialog: GlobalDialogId | null;
  openDialog: (dialog: GlobalDialogId) => void;
  closeDialog: () => void;
}

/** Global UI state for cross-cutting create dialogs. */
export const useDialogStore = create<DialogState>((set) => ({
  dialog: null,
  openDialog: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null }),
}));
