import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { Toast } from "@/lib/toast-store";
import { CHIP_TONES, ICONS, ICON_TONES } from "./toast-tokens";
import { ToastActionButton } from "./toast-action";
import { ToastCountdown } from "./toast-countdown";

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: number) => void;
}

/** One toast card: tinted icon chip, text, optional action pill + countdown. */
export function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const { t } = useTranslation();
  const Icon = ICONS[toast.variant];

  return (
    <div
      role="status"
      className="pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-xl border bg-background px-4 py-3 shadow-popover animate-in fade-in-0 slide-in-from-bottom-2 duration-200 ease-out"
    >
      {toast.action ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 start-0 w-1 rounded-s-xl bg-gradient-to-b from-primary to-primary-strong"
        />
      ) : null}
      <span
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
          CHIP_TONES[toast.variant],
        )}
      >
        <Icon className={cn("size-4", ICON_TONES[toast.variant])} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{toast.message}</p>
        {toast.description ? (
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
            {toast.description}
          </p>
        ) : null}
        {toast.action ? (
          <ToastActionButton action={toast.action} onDone={() => onDismiss(toast.id)} />
        ) : null}
      </div>
      <button
        type="button"
        aria-label={t("common.dismiss")}
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
      {toast.duration !== undefined ? <ToastCountdown duration={toast.duration} /> : null}
    </div>
  );
}