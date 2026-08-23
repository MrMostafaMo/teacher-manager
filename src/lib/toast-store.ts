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

/** Max cards visible at once — the oldest non-sticky toast is dropped. */
const MAX_TOASTS = 4;
/** Auto-dismiss delay when the caller sets no explicit duration. */
const DEFAULT_DURATION = 3500;

interface Timer {
  handle: number;
  remaining: number;
  since: number;
}

/** Live auto-dismiss timers, tracked outside the store so hover can pause them. */
const timers = new Map<number, Timer>();

interface ToastStore {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
  pause: (id: number) => void;
  resume: (id: number) => void;
}

function start(id: number, ms: number) {
  stop(id);
  timers.set(id, {
    handle: window.setTimeout(() => useToastStore.getState().dismiss(id), ms),
    remaining: ms,
    since: Date.now(),
  });
}

function stop(id: number) {
  const timer = timers.get(id);
  if (!timer) return;
  window.clearTimeout(timer.handle);
  timers.delete(id);
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = nextId++;
    set((s) => {
      // Sticky errors stay until dismissed; other variants auto-dismiss.
      const item: Toast = {
        ...toast,
        id,
        duration:
          toast.variant === "error" ? undefined : (toast.duration ?? DEFAULT_DURATION),
      };
      // An identical card restarts in place instead of stacking duplicates.
      const isSame = (a: Toast) =>
        a.variant === item.variant &&
        a.message === item.message &&
        a.description === item.description;
      const same = s.toasts.find(isSame);
      if (same) stop(same.id);
      const kept = s.toasts.filter((t) => !same || t.id !== same.id);
      // Cap the stack: drop the oldest overflow toasts.
      const dropped = kept.slice(0, Math.max(0, kept.length + 1 - MAX_TOASTS));
      dropped.forEach((t) => stop(t.id));
      if (item.duration !== undefined) start(id, item.duration);
      return { toasts: [...kept.filter((t) => !dropped.includes(t)), item] };
    });
  },
  dismiss: (id) => {
    stop(id);
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
  pause: (id) => {
    const timer = timers.get(id);
    if (!timer) return;
    window.clearTimeout(timer.handle);
    timer.remaining -= Date.now() - timer.since;
    timers.set(id, { ...timer, handle: 0 });
  },
  resume: (id) => {
    const timer = timers.get(id);
    if (!timer || timer.handle !== 0 || timer.remaining <= 0) return;
    start(id, timer.remaining);
  },
}));

export function toast(message: string, variant: ToastVariant = "success", description?: string) {
  useToastStore.getState().push({ message, variant, description });
}
