import { useEffect, useRef } from "react";
import { DATA_CHANGED_EVENT, type DataChangedScope } from "@/lib/undo-store";

export function useDataChanged(callback: () => void, scopes?: DataChangedScope[]): void {
  const ref = useRef(callback);
  const key = scopes?.join(",") ?? "";
  useEffect(() => {
    ref.current = callback;
  }, [callback]);
  useEffect(() => {
    const wanted = key ? (key.split(",") as DataChangedScope[]) : [];
    const handler = (e: Event) => {
      if (wanted.length === 0) {
        ref.current();
        return;
      }
      const scope = (e as CustomEvent<{ scope?: DataChangedScope }>).detail?.scope;
      // Global (unscoped) events still refetch every subscriber.
      if (!scope || wanted.includes(scope)) ref.current();
    };
    window.addEventListener(DATA_CHANGED_EVENT, handler);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, handler);
  }, [key]);
}
