import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { cycleTabFocus } from "./cycle-tab-focus";

/**
 * Minimal modal on the native <dialog> element: no portal, no dependencies,
 * focus and Escape handling come from the browser. Entry animation is pure
 * CSS (tw-animate-css); prefers-reduced-motion is respected globally.
 */
interface ModalProps {
  open: boolean;
  title: string;
  /** Optional subtitle rendered under the title. */
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Width override, e.g. "max-w-lg". */
  className?: string;
}

export function Modal({ open, title, description, onClose, children, className }: ModalProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();
  const prevActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      prevActiveRef.current = dialog.ownerDocument.activeElement as HTMLElement | null;
      dialog.showModal();
      // Focus first focusable inside the modal
      dialog.querySelector<HTMLElement>("input, select, textarea, button:not([disabled])")?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
      prevActiveRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const dialog = ref.current;
    if (!dialog) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Tab") cycleTabFocus(e, dialog);
    }
    dialog.addEventListener("keydown", onKeyDown);
    return () => dialog.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className={cn(
        "m-auto w-full max-w-md overflow-hidden rounded-2xl bg-background text-foreground shadow-(--popover-shadow) ring-1 ring-foreground/10 backdrop:bg-black/40 backdrop:backdrop-blur-[2px] animate-in fade-in-0 zoom-in-95 duration-200 backdrop:animate-in backdrop:fade-in-0 backdrop:duration-200",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2 border-b bg-muted/30 px-5 py-4">
        <div className="min-w-0">
          <h3 id={titleId} className="text-base font-semibold">
            {title}
          </h3>
          {description ? (
            <p id={descId} className="mt-0.5 text-xs text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <Button variant="ghost" size="icon-sm" aria-label={t("common.close")} onClick={onClose}>
          <X />
        </Button>
      </div>
      <div className="max-h-[calc(90dvh-3.5rem)] overflow-y-auto overscroll-contain p-4 sm:p-5">{children}</div>
    </dialog>
  );
}
