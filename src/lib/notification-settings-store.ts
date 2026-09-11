import { shimStore } from "@/lib/settings/settings-store";
import type { NotificationType } from "@/features/notifications/domain";

export interface NotificationSettingsState {
  enabled: boolean;
  osBanners: boolean;
  mutedTypes: Record<NotificationType, boolean>;
  setEnabled: (enabled: boolean) => void;
  setOsBanners: (osBanners: boolean) => void;
  toggleType: (type: NotificationType) => void;
}

/** Compatibility shim over the unified settings store (one release). */
export const useNotificationSettings = shimStore<NotificationSettingsState>((s) => ({
  enabled: s.notificationsEnabled,
  osBanners: s.osBanners,
  mutedTypes: s.mutedTypes as Record<NotificationType, boolean>,
  setEnabled: s.setEnabled,
  setOsBanners: s.setOsBanners,
  toggleType: s.toggleType as (type: NotificationType) => void,
}));

export function isNotificationEnabled(
  settings: Pick<NotificationSettingsState, "enabled" | "mutedTypes">,
  type: NotificationType,
): boolean {
  return settings.enabled && !settings.mutedTypes[type];
}
