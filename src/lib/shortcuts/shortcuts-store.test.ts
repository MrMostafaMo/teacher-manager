import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useShortcutsStore } from "./shortcuts-store";

beforeEach(() => {
  act(() => useShortcutsStore.getState().resetShortcuts());
});

describe("useShortcutsStore", () => {
  it("returns defaults on fresh state", () => {
    const { result } = renderHook(() => useShortcutsStore());
    expect(result.current.shortcuts["nav:/"]).toBe("ctrl+d");
    expect(result.current.shortcuts["action:help"]).toBe("ctrl+/");
  });

  it("sets a single shortcut", () => {
    const { result } = renderHook(() => useShortcutsStore());
    act(() => result.current.setShortcut("nav:/", "ctrl+z"));
    expect(result.current.shortcuts["nav:/"]).toBe("ctrl+z");
  });

  it("resets one shortcut back to default", () => {
    const { result } = renderHook(() => useShortcutsStore());
    act(() => result.current.setShortcut("nav:/", "ctrl+z"));
    act(() => result.current.resetShortcut("nav:/"));
    expect(result.current.shortcuts["nav:/"]).toBe("ctrl+d");
  });

  it("resets all shortcuts to defaults", () => {
    const { result } = renderHook(() => useShortcutsStore());
    act(() => result.current.setShortcut("nav:/", "ctrl+z"));
    act(() => result.current.setShortcut("action:help", "ctrl+shift+slash"));
    act(() => result.current.resetShortcuts());
    expect(result.current.shortcuts["nav:/"]).toBe("ctrl+d");
    expect(result.current.shortcuts["action:help"]).toBe("ctrl+/");
  });

  it("finds default for any id", () => {
    const { result } = renderHook(() => useShortcutsStore());
    expect(result.current.getDefault("nav:/")).toBe("ctrl+d");
  });

  it("detects duplicate combos (excluding the given id)", () => {
    const { result } = renderHook(() => useShortcutsStore());
    expect(result.current.findDuplicate("nav:/", "ctrl+d")).toBeUndefined();
    expect(result.current.findDuplicate("nav:/", "ctrl+a")).toBe("nav:/attendance");
  });
});
