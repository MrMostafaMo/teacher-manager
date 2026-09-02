import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCountUp } from "./useCountUp";

let time = 0;

describe("useCountUp", () => {
  beforeEach(() => {
    time = 0;
    vi.useFakeTimers();
    vi.stubGlobal("performance", { now: () => time });
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("starts at 0", () => {
    const { result } = renderHook(() => useCountUp(100));
    expect(result.current).toBe(0);
  });

  it("animates to the target value", () => {
    const { result } = renderHook(() => useCountUp(100, 100));
    act(() => {
      time = 100;
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe(100);
  });

  it("handles 0 target", () => {
    const { result } = renderHook(() => useCountUp(0));
    expect(result.current).toBe(0);
  });

  it("jumps straight to the target under reduced motion", () => {
    vi.mocked(globalThis.matchMedia).mockReturnValue({ matches: true } as unknown as MediaQueryList);
    const { result } = renderHook(() => useCountUp(100, 100));
    expect(result.current).toBe(100);
    act(() => {
      time = 100;
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe(100);
  });

  it("animates from previous value when target changes", () => {
    const { result, rerender } = renderHook(({ target }) => useCountUp(target, 100), {
      initialProps: { target: 100 },
    });
    act(() => {
      time = 100;
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe(100);
    act(() => {
      rerender({ target: 50 });
    });
    // should stay at previous value, not reset to 0
    expect(result.current).toBe(100);
    act(() => {
      time = 200;
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe(50);
  });

  it("cleans up animation frame on unmount", () => {
    const cancelSpy = vi.spyOn(globalThis, "cancelAnimationFrame");
    const { unmount } = renderHook(() => useCountUp(200, 200));
    unmount();
    expect(cancelSpy).toHaveBeenCalled();
  });
});
