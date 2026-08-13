import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { DATA_CHANGED_EVENT } from "@/shared/GlobalDialogs";
import { notifySystem } from "@/lib/notify-system";
import { notificationText } from "./notification-text";
import { useNotificationsStore } from "./notifications-store";

/** Refreshes notifications on mount and on data changes, and fires OS banners
 * for items newly generated since the last refresh. Renders nothing. */
export function NotificationSync() {
  const { t } = useTranslation();
  const refresh = useNotificationsStore((s) => s.refresh);

  useEffect(() => {
    let mounted = true;
    async function sync() {
      try {
        const fresh = await refresh();
        if (!mounted) return;
        for (const item of fresh) {
          await notifySystem(
            t("notifications.title"),
            notificationText({ type: item.type, details: item.details }, t),
          );
        }
      } catch (error) {
        console.error("Notification refresh failed", error);
      }
    }
    void sync();
    window.addEventListener(DATA_CHANGED_EVENT, sync);
    return () => {
      mounted = false;
      window.removeEventListener(DATA_CHANGED_EVENT, sync);
    };
  }, [refresh, t]);

  return null;
}
