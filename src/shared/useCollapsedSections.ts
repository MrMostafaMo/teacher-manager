import { useCallback, useState } from "react";

/**
 * Per-section collapse state for CollapsibleSection lists. Sections default to
 * collapsed; `toggle(key)` flips a section and `isCollapsed(key)` reads it.
 */
export function useCollapsedSections() {
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const isCollapsed = useCallback(
    (key: string) => overrides[key] ?? true,
    [overrides],
  );

  const toggle = useCallback((key: string) => {
    setOverrides((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  }, []);

  return { isCollapsed, toggle };
}
