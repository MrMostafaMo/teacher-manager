import { useToastStore } from "@/lib/toast-store";
import { ToastItem } from "./toast-item";

/** Toast composition root — the store feeds one ToastItem per toast. */
export function ToastViewport() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-4 start-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 rtl:translate-x-1/2"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
}
