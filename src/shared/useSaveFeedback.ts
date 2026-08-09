import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Tracks a save action's `saving`/`saved` state with an auto-clearing
 * success flag (2.5s). Errors stay with the caller: load-time and
 * save-time errors render differently per call site.
 */
export function useSaveFeedback() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const busyRef = useRef(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const run = useCallback(async (fn: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setSaving(true);
    setSaved(false);
    try {
      await fn();
      setSaved(true);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setSaved(false), 2500);
    } finally {
      busyRef.current = false;
      setSaving(false);
    }
  }, []);

  const clear = useCallback(() => {
    setSaved(false);
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  return { saving, saved, run, clear };
}
