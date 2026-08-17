import { create } from "zustand";

export type ToastVariant = "success" | "error" | "info";

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface Toast {
  id: number;
  variant: ToastVariant;
  message: string;
  description?: string;
  /** Overrides the default auto-dismiss delay (ms). */
  duration?: number;
  /** Optional action button (e.g. «تراجع» for undo toasts). */
  action?: ToastAction;
}

let nextId = 1;

interface ToastStore {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    window.setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, toast.duration ?? 3500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(message: string, variant: ToastVariant = "success", description?: string) {
  useToastStore.getState().push({ message, variant, description });
}
