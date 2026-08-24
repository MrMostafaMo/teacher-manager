import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NotificationType } from "@/features/notifications/domain";

const STORAGE_KEY = "tm-notification-settings";

export interface NotificationSettingsState {
  enabled: boolean;
  osBanners: boolean;
  mutedTypes: Record<NotificationType, boolean>;
  setEnabled: (enabled: boolean) => void;
  setOsBanners: (osBanners: boolean) => void;
  toggleType: (type: NotificationType) => void;
}

const ALL_TYPES_FALSE: Record<NotificationType, boolean> = {
  homework_overdue: false,
  payment_overdue: false,
  exception: false,
  weak_skill: false,
  low_attendance: false,
  exam_upcoming: false,
  student_birthday: false,
  session_warning: false,
  session_due: false,
};

export const useNotificationSettings = create<NotificationSettingsState>()(
  persist(
    (set) => ({
      enabled: true,
      osBanners: true,
      mutedTypes: { ...ALL_TYPES_FALSE },
      setEnabled: (enabled) => set({ enabled }),
      setOsBanners: (osBanners) => set({ osBanners }),
      toggleType: (type) =>
        set((s) => ({ mutedTypes: { ...s.mutedTypes, [type]: !s.mutedTypes[type] } })),
    }),
    { name: STORAGE_KEY },
  ),
);

export function isNotificationEnabled(
  settings: NotificationSettingsState,
  type: NotificationType,
): boolean {
  return settings.enabled && !settings.mutedTypes[type];
}
