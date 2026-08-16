import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCollapsedSections } from "./useCollapsedSections";

describe("useCollapsedSections", () => {
  it("defaults every section to collapsed", () => {
    const { result } = renderHook(() => useCollapsedSections());
    expect(result.current.isCollapsed("g1")).toBe(true);
    expect(result.current.isCollapsed("g2")).toBe(true);
  });

  it("toggles a default-collapsed section open", () => {
    const { result } = renderHook(() => useCollapsedSections());
    act(() => {
      result.current.toggle("g1");
    });
    expect(result.current.isCollapsed("g1")).toBe(false);
  });

  it("toggles an open section back to collapsed", () => {
    const { result } = renderHook(() => useCollapsedSections());
    act(() => {
      result.current.toggle("g1");
    });
    act(() => {
      result.current.toggle("g1");
    });
    expect(result.current.isCollapsed("g1")).toBe(true);
  });

  it("keeps section state independent", () => {
    const { result } = renderHook(() => useCollapsedSections());
    act(() => {
      result.current.toggle("g1");
    });
    expect(result.current.isCollapsed("g1")).toBe(false);
    expect(result.current.isCollapsed("g2")).toBe(true);
  });

  it("honours per-section defaults", () => {
    const { result } = renderHook(() => useCollapsedSections({ attendance: false }));
    expect(result.current.isCollapsed("attendance")).toBe(false);
    expect(result.current.isCollapsed("payments")).toBe(true);
  });

  it("lets a toggle override a default", () => {
    const { result } = renderHook(() => useCollapsedSections({ attendance: false }));
    act(() => {
      result.current.toggle("attendance");
    });
    expect(result.current.isCollapsed("attendance")).toBe(true);
  });
});
