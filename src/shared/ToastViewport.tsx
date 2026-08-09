import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToastStore, type ToastVariant } from "@/lib/toast-store";
import { cn } from "@/lib/utils";

const ICONS: Record<ToastVariant, typeof Info> = {
  success: CheckCircle2,
  error: TriangleAlert,
  info: Info,
};

const TONES: Record<ToastVariant, string> = {
  success: "text-(--chart-2)",
  error: "text-destructive",
  info: "text-primary",
};

export function ToastViewport() {
  const { t } = useTranslation();
  const { toasts, dismiss } = useToastStore();

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-4 start-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 rtl:translate-x-1/2"
    >
      {toasts.map((toast) => {
        const Icon = ICONS[toast.variant];
        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex items-start gap-3 rounded-xl border bg-background px-4 py-3 shadow-popover animate-in fade-in-0 slide-in-from-bottom-2 duration-200 ease-out"
          >
            <Icon className={cn("mt-0.5 size-4 shrink-0", TONES[toast.variant])} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">{toast.message}</p>
              {toast.description ? (
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                  {toast.description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              aria-label={t("common.dismiss")}
              onClick={() => dismiss(toast.id)}
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
