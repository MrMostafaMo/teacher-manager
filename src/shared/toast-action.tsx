import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ToastAction } from "@/lib/toast-store";

interface ToastActionButtonProps {
  action: ToastAction;
  onDone: () => void;
}

/**
 * The toast's action pill. Reuses the app's cva Button (gradient CTA) so
 * hover/active/focus states come for free; the undo arrow mirrors under RTL.
 */
export function ToastActionButton({ action, onDone }: ToastActionButtonProps) {
  return (
    <Button
      type="button"
      variant="default"
      size="sm"
      onClick={() => {
        action.onPress();
        onDone();
      }}
      className="mt-2"
    >
      <Undo2 className="rtl:-scale-x-100" />
      {action.label}
    </Button>
  );
}