import { useEffect, useRef } from "react";
import { DATA_CHANGED_EVENT } from "@/lib/undo-store";

export function useDataChanged(callback: () => void): void {
  const ref = useRef(callback);
  ref.current = callback;
  useEffect(() => {
    const handler = () => ref.current();
    window.addEventListener(DATA_CHANGED_EVENT, handler);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, handler);
  }, []);
}
