import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-full max-w-md overflow-hidden rounded-xl bg-background text-foreground shadow-lg ring-1 ring-foreground/20 backdrop:bg-black/40 backdrop:backdrop-blur-sm animate-in fade-in-0 zoom-in-95 duration-200 backdrop:animate-in backdrop:fade-in-0 backdrop:duration-200",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2 border-b px-4 py-3">
        <div className="min-w-0">
          <h3 id={titleId} className="text-base font-semibold">
            {title}
          </h3>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <Button variant="ghost" size="icon-sm" aria-label={t("common.close")} onClick={onClose}>
          <X />
        </Button>
      </div>
      <div className="max-h-[calc(90dvh-3.5rem)] overflow-y-auto p-4">{children}</div>
    </dialog>
  );
}
