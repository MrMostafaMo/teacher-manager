import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Minimal modal on the native <dialog> element: no portal, no dependencies,
 * focus and Escape handling come from the browser.
 */
interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, title, onClose, children, className }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-full max-w-md overflow-hidden rounded-xl bg-background text-foreground shadow-xl ring-1 ring-foreground/10 backdrop:bg-black/50",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h3 className="text-base font-semibold">{title}</h3>
        <Button variant="ghost" size="icon-sm" aria-label="close" onClick={onClose}>
          <X />
        </Button>
      </div>
      <div className="max-h-[calc(90dvh-3.5rem)] overflow-y-auto p-4">{children}</div>
    </dialog>
  );
}
