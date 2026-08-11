import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Two-click destructive confirmation. `request(id)` arms an id (returning
 * `false`); calling it again for the same armed id confirms (returns `true`)
 * and disarms. Any prior timer is cleared so a re-armed id gets a full window,
 * and the timer is cleared on unmount.
 */
export function useConfirmDelete(timeoutMs = 2500) {
  const [armed, setArmed] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const clear = useCallback(() => {
    setArmed(null);
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const request = useCallback(
    (id: string): boolean => {
      if (armed === id) {
        clear();
        return true;
      }
      if (timer.current !== null) window.clearTimeout(timer.current);
      setArmed(id);
      timer.current = window.setTimeout(() => {
        setArmed((cur) => (cur === id ? null : cur));
        timer.current = null;
      }, timeoutMs);
      return false;
    },
    [armed, clear, timeoutMs],
  );

  return { armed, request, clear };
}
