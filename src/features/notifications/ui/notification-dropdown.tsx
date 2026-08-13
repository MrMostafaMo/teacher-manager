import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Bell, CheckCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PopoverShell } from "@/shared/popover-shell";
import { useNotifications } from "./use-notifications";
import { NotificationList } from "./notification-list";
import type { ActiveNotification } from "@/features/notifications/application/notification-query-cases";

const ROUTE_BY_TYPE: Record<string, string> = {
  homework_overdue: "/homework",
  payment_overdue: "/payments",
  exception: "/schedule",
  weak_skill: "/skills",
  low_attendance: "/attendance",
};

/** Header bell: unread badge + popover with mark-read/dismiss actions. */
export function NotificationDropdown() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, unreadCount, loading, refresh, markRead, markAllRead, dismiss, dismissAll } = useNotifications();
  const [open, setOpen] = useState(false);

  function openBell() {
    setOpen((o) => !o);
    void refresh();
  }

  function onRowClick(item: ActiveNotification) {
    void markRead(item.id);
    setOpen(false);
    navigate(ROUTE_BY_TYPE[item.type] ?? "/");
  }

  return (
    <PopoverShell
      open={open}
      onClose={() => setOpen(false)}
      width="w-80"
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          aria-label={t("notifications.title")}
          title={t("notifications.title")}
          onClick={openBell}
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -end-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      }
    >
      <div className="flex items-center justify-between px-1 pb-1">
        <p className="text-sm font-semibold">{t("notifications.title")}</p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={t("notifications.markAllRead")}
            title={t("notifications.markAllRead")}
            onClick={() => void markAllRead()}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={t("notifications.dismissAll")}
            title={t("notifications.dismissAll")}
            onClick={() => void dismissAll()}
            disabled={items.length === 0}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="px-1 py-4 text-center text-xs text-muted-foreground">{t("common.loading")}</p>
      ) : items.length === 0 ? (
        <p className="px-1 py-4 text-center text-xs text-muted-foreground">{t("notifications.empty")}</p>
      ) : (
        <NotificationList items={items} onOpen={onRowClick} onDismiss={(id) => void dismiss(id)} />
      )}
    </PopoverShell>
  );
}
