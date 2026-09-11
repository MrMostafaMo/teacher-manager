import { useToastStore } from "@/lib/toast-store";
import { ToastItem } from "./toast-item";

/** Toast composition root — the store feeds one ToastItem per toast. */
export function ToastViewport() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 mx-auto flex w-fit max-w-[min(92vw,28rem)] flex-col items-center gap-2 px-4"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
}
