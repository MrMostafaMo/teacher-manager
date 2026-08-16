import { useCallback, useState } from "react";

/**
 * Per-section collapse state for CollapsibleSection lists. Sections default to
 * `defaults[key]` (or collapsed when absent); `toggle(key)` flips a section
 * and `isCollapsed(key)` reads it.
 */
export function useCollapsedSections(defaults?: Record<string, boolean>) {
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const isCollapsed = useCallback(
    (key: string) => overrides[key] ?? defaults?.[key] ?? true,
    [overrides, defaults],
  );

  const toggle = useCallback(
    (key: string) => {
      setOverrides((prev) => ({ ...prev, [key]: !(prev[key] ?? defaults?.[key] ?? true) }));
    },
    [defaults],
  );

  return { isCollapsed, toggle };
}
