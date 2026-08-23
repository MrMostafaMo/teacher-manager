import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast, useToastStore } from "./toast-store";

function reset() {
  for (const t of useToastStore.getState().toasts) useToastStore.getState().dismiss(t.id);
}

describe("toast store policy", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reset();
  });
  afterEach(() => {
    vi.useRealTimers();
    reset();
  });

  it("caps the stack at four cards, dropping the oldest", () => {
    for (let i = 0; i < 6; i++) toast(`m${i}`);
    expect(useToastStore.getState().toasts.map((t) => t.message)).toEqual([
      "m2",
      "m3",
      "m4",
      "m5",
    ]);
  });

  it("keeps sticky errors until dismissed", () => {
    toast("boom", "error");
    vi.advanceTimersByTime(60_000);
    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  it("auto-dismisses successes after 3.5s", () => {
    toast("saved");
    vi.advanceTimersByTime(3499);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("restarts an identical card instead of stacking duplicates", () => {
    toast("saved");
    toast("saved");
    const { toasts } = useToastStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe("saved");
  });

  it("pauses on hover and resumes with the remaining time", () => {
    toast("saved");
    const { id } = useToastStore.getState().toasts[0];
    useToastStore.getState().pause(id);
    vi.advanceTimersByTime(60_000);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    useToastStore.getState().resume(id);
    vi.advanceTimersByTime(3499);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("drops overflow timers while survivors keep their own deadlines", () => {
    toast("a");
    vi.advanceTimersByTime(1750); // "a" is half-lived
    toast("b");
    vi.advanceTimersByTime(1751); // t=3501 — "a"'s original deadline landed
    expect(useToastStore.getState().toasts.map((t) => t.message)).toEqual(["b"]);
    vi.advanceTimersByTime(1499); // t=5000... wait, "b" dies at its own 1750+3500
    expect(useToastStore.getState().toasts.map((t) => t.message)).toEqual(["b"]);
    vi.advanceTimersByTime(250); // t=5250 — "b"'s deadline lands
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});
