import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DATA_CHANGED_EVENT,
  MAX_UNDO_ENTRIES,
  UNDO_TTL,
  notifyUndo,
  useUndoStore,
} from "./undo-store";
import { useToastStore } from "./toast-store";

afterEach(() => {
  useUndoStore.setState({ entries: [] });
  useToastStore.setState({ toasts: [] });
  vi.useRealTimers();
});

describe("undo store", () => {
  it("undo calls the registered restore and clears the entry", async () => {
    const restore = vi.fn(async () => {});
    const id = useUndoStore.getState().register(restore);
    await useUndoStore.getState().undo(id);
    expect(restore).toHaveBeenCalledTimes(1);
    expect(useUndoStore.getState().entries).toHaveLength(0);
  });

  it("undo fires the global data-changed event", async () => {
    const handler = vi.fn();
    window.addEventListener(DATA_CHANGED_EVENT, handler);
    const id = useUndoStore.getState().register(async () => {});
    await useUndoStore.getState().undo(id);
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener(DATA_CHANGED_EVENT, handler);
  });

  it("undo on an unknown id is a silent no-op", async () => {
    await expect(useUndoStore.getState().undo(999)).resolves.toBeUndefined();
  });

  it("entries expire after UNDO_TTL", async () => {
    vi.useFakeTimers();
    const restore = vi.fn(async () => {});
    const id = useUndoStore.getState().register(restore);
    vi.advanceTimersByTime(UNDO_TTL);
    await useUndoStore.getState().undo(id);
    expect(restore).not.toHaveBeenCalled();
  });

  it("caps the stack at MAX_UNDO_ENTRIES", () => {
    for (let i = 0; i < MAX_UNDO_ENTRIES + 3; i++) {
      useUndoStore.getState().register(async () => {});
    }
    expect(useUndoStore.getState().entries).toHaveLength(MAX_UNDO_ENTRIES);
  });

  it("notifyUndo pushes a toast wired to the entry", async () => {
    const restore = vi.fn(async () => {});
    const id = useUndoStore.getState().register(restore);
    notifyUndo(id, "Deleted", "Expense", "Undo");
    const [toast] = useToastStore.getState().toasts;
    expect(toast.duration).toBe(UNDO_TTL);
    expect(toast.action?.label).toBe("Undo");
    toast.action?.onPress();
    await vi.waitFor(() => expect(restore).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(useUndoStore.getState().entries).toHaveLength(0));
  });
});
