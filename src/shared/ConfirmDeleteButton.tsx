import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmDeleteButtonProps {
  armed: boolean;
  deleteLabel: string;
  confirmLabel: string;
  onDelete: () => void;
  className?: string;
}

/**
 * Delete button with an inline two-click confirm. When not armed it renders the
 * trash icon; once armed it shows a confirmation message («هل أنت متأكد؟»)
 * beside a destructive confirm button. Arming/timing is owned by
 * `useConfirmDelete` (the caller keeps `armed` and calls `onDelete` which arms
 * on first click and deletes on the confirming click).
 */
export function ConfirmDeleteButton({
  armed,
  deleteLabel,
  confirmLabel,
  onDelete,
  className,
}: ConfirmDeleteButtonProps) {
  const { t } = useTranslation();
  if (armed) {
    return (
      <span className={cn("inline-flex items-center gap-1.5", className)}>
        <span className="max-w-40 truncate text-xs font-medium text-destructive">
          {t("common.confirmMessage")}
        </span>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          {confirmLabel}
        </Button>
      </span>
    );
  }
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn("text-muted-foreground hover:text-destructive", className)}
      aria-label={deleteLabel}
      title={deleteLabel}
      onClick={onDelete}
    >
      <Trash2 />
    </Button>
  );
}
