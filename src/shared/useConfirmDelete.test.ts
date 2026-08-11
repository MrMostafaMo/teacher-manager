import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useConfirmDelete } from "./useConfirmDelete";

const arm = (hook: { current: { request: (id: string) => boolean } }, id: string): boolean => {
  let confirmed = false;
  act(() => {
    confirmed = hook.current.request(id);
  });
  return confirmed;
};

describe("useConfirmDelete", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("arms an id on the first request", () => {
    const { result } = renderHook(() => useConfirmDelete());
    expect(result.current.armed).toBeNull();
    expect(arm(result, "a")).toBe(false);
    expect(result.current.armed).toBe("a");
  });

  it("confirms when the same id is requested twice", () => {
    const { result } = renderHook(() => useConfirmDelete());
    arm(result, "a");
    expect(arm(result, "a")).toBe(true);
    expect(result.current.armed).toBeNull();
  });

  it("auto-disarms after the timeout", () => {
    const { result } = renderHook(() => useConfirmDelete());
    arm(result, "a");
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(result.current.armed).toBeNull();
  });

  it("gives a re-armed id a full confirmation window", () => {
    const { result } = renderHook(() => useConfirmDelete());
    arm(result, "a");
    arm(result, "a");
    arm(result, "a");
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.armed).toBe("a");
    act(() => {
      vi.advanceTimersByTime(2200);
    });
    expect(result.current.armed).toBeNull();
  });

  it("arming a different id replaces the previous timer", () => {
    const { result } = renderHook(() => useConfirmDelete());
    arm(result, "a");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(arm(result, "b")).toBe(false);
    expect(result.current.armed).toBe("b");
    act(() => {
      vi.advanceTimersByTime(2200);
    });
    expect(result.current.armed).toBe("b");
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.armed).toBeNull();
  });

  it("clear disarms and cancels the pending timer", () => {
    const { result } = renderHook(() => useConfirmDelete());
    arm(result, "a");
    act(() => {
      result.current.clear();
    });
    expect(result.current.armed).toBeNull();
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(result.current.armed).toBeNull();
  });
});
