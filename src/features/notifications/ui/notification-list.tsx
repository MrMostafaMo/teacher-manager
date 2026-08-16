import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/format";
import { notificationText } from "./notification-text";
import type { ActiveNotification } from "@/features/notifications/application/notification-query-cases";

/** Scrollable notification rows: unread dot, body text, timestamp, dismiss. */
export function NotificationList({
  items,
  onOpen,
  onDismiss,
}: {
  items: ActiveNotification[];
  onOpen: (item: ActiveNotification) => void;
  onDismiss: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <ul className="space-y-0.5">
      {items.map((item) => (
        <li key={item.id} className="group relative">
          <button
            type="button"
            onClick={() => onOpen(item)}
            className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-start hover:bg-accent"
          >
            <span
              className={cn(
                "mt-1.5 size-2 shrink-0 rounded-full",
                item.read ? "bg-muted-foreground/30" : "bg-primary",
              )}
              aria-hidden
            />
            <span className="min-w-0">
              <span className="block text-xs leading-snug">{notificationText(item, t)}</span>
              <span className="mt-0.5 block text-[10px] text-muted-foreground">
                {formatDate(item.createdAt, "DD-MM-YYYY HH:mm")}
              </span>
            </span>
          </button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="absolute end-1 top-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
            aria-label={t("notifications.dismiss")}
            title={t("notifications.dismiss")}
            onClick={() => onDismiss(item.id)}
          >
            <X className="size-3" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
