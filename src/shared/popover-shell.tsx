import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const MARGIN = 8;
const POPOVER_WIDTHS: Record<string, number> = { "w-56": 224, "w-64": 256, "w-72": 288, "w-80": 320 };

export function PopoverShell({
  open,
  onClose,
  trigger,
  children,
  width = "w-72",
}: {
  open: boolean;
  onClose: () => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
  width?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; maxHeight: number } | null>(null);

  const update = useCallback(() => {
    const wrapper = ref.current;
    if (!wrapper) return;
    const r = wrapper.getBoundingClientRect();
    const popW = POPOVER_WIDTHS[width] ?? 288;
    const below = window.innerHeight - r.bottom - MARGIN;
    const above = r.top - MARGIN;
    const maxHeight = Math.max(below, above);
    const isRtl = (document.documentElement.dir ?? "ltr") === "rtl";
    const start = isRtl ? r.right - popW : r.left;
    const left = Math.min(Math.max(start, MARGIN), window.innerWidth - popW - MARGIN);
    if (below >= above) setPos({ top: r.bottom + MARGIN, left, maxHeight });
    else setPos({ bottom: window.innerHeight - r.top + MARGIN, left, maxHeight });
  }, [width]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, update]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onClose]);

  return (
    <div ref={ref} className="relative inline-flex">
      {trigger}
      {open && pos && (
        <div
          style={{
            top: pos.top,
            bottom: pos.bottom,
            left: pos.left,
            maxHeight: pos.maxHeight,
          }}
          className={cn(
            "fixed z-50 animate-in fade-in-0 zoom-in-95 overflow-y-auto rounded-lg border bg-popover p-2 text-popover-foreground shadow-md",
            width,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
