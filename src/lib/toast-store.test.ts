import { afterEach, describe, expect, it, vi } from "vitest";
import { useToastStore } from "./toast-store";

afterEach(() => {
  useToastStore.setState({ toasts: [] });
  vi.useRealTimers();
});

describe("toast store", () => {
  it("push adds toasts with unique ids", () => {
    useToastStore.getState().push({ message: "ok", variant: "success" });
    useToastStore.getState().push({ message: "err", variant: "error" });
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(2);
    expect(toasts[0].id).not.toBe(toasts[1].id);
    expect(toasts[0].message).toBe("ok");
  });

  it("dismiss removes a single toast", () => {
    useToastStore.getState().push({ message: "a", variant: "success" });
    useToastStore.getState().push({ message: "b", variant: "success" });
    const id = useToastStore.getState().toasts[0].id;
    useToastStore.getState().dismiss(id);
    expect(useToastStore.getState().toasts).toEqual([expect.objectContaining({ message: "b" })]);
  });

  it("auto-dismisses after the default 3500ms", () => {
    vi.useFakeTimers();
    useToastStore.getState().push({ message: "ok", variant: "success" });
    vi.advanceTimersByTime(3499);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("honors a custom duration", () => {
    vi.useFakeTimers();
    useToastStore.getState().push({ message: "undo", variant: "info", duration: 5000 });
    vi.advanceTimersByTime(4000);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(1000);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("carries action and duration through", () => {
    const onPress = () => {};
    useToastStore.getState().push({
      message: "x",
      variant: "info",
      duration: 5000,
      action: { label: "Undo", onPress },
    });
    expect(useToastStore.getState().toasts[0]).toMatchObject({
      duration: 5000,
      action: { label: "Undo" },
    });
  });
});
