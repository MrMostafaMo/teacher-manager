import { useTranslation } from "react-i18next";
import {
  Bell,
  BellOff,
  BookOpen,
  Cake,
  CalendarClock,
  CircleAlert,
  GraduationCap,
  Megaphone,
  Wallet,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNotificationSettings } from "@/lib/notification-settings-store";
import type { NotificationType } from "@/features/notifications/domain";

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  homework_overdue: BookOpen,
  payment_overdue: Wallet,
  exception: CalendarClock,
  weak_skill: CircleAlert,
  low_attendance: GraduationCap,
  exam_upcoming: Megaphone,
  student_birthday: Cake,
  session_warning: Wallet,
  session_due: Wallet,
};

const TYPE_KEY: Record<NotificationType, string> = {
  homework_overdue: "homework",
  payment_overdue: "payment",
  exception: "exception",
  weak_skill: "weakSkill",
  low_attendance: "lowAttendance",
  exam_upcoming: "exam",
  student_birthday: "birthday",
  session_warning: "sessionWarning",
  session_due: "sessionDue",
};

function Toggle({
  enabled,
  onClick,
  label,
}: {
  enabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <Button
      variant={enabled ? "default" : "outline"}
      size="sm"
      className={cn("h-7 px-2.5 text-xs", enabled && "shadow-none")}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

const ALL_TYPES: NotificationType[] = [
  "homework_overdue",
  "payment_overdue",
  "exception",
  "weak_skill",
  "low_attendance",
  "exam_upcoming",
  "student_birthday",
  "session_warning",
  "session_due",
];

export function SettingsNotificationsCard() {
  const { t } = useTranslation();
  const { enabled, osBanners, mutedTypes, setEnabled, setOsBanners, toggleType } =
    useNotificationSettings();
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Bell className="size-4" />
          {t("notifications.settings.title")}
        </div>
        <div className="space-y-3">
          <Row
            icon={enabled ? Bell : BellOff}
            label={t("notifications.settings.master")}
          >
            <Toggle
              enabled={enabled}
              onClick={() => setEnabled(!enabled)}
              label={enabled ? t("notifications.settings.on") : t("notifications.settings.off")}
            />
          </Row>
          <Row icon={Megaphone} label={t("notifications.settings.osBanners")}>
            <Toggle
              enabled={osBanners}
              onClick={() => setOsBanners(!osBanners)}
              label={osBanners ? t("notifications.settings.on") : t("notifications.settings.off")}
            />
          </Row>
          {ALL_TYPES.map((type) => (
            <Row key={type} icon={TYPE_ICON[type]} label={t(`notifications.settings.types.${TYPE_KEY[type]}`)}>
              <Toggle
                enabled={enabled && !mutedTypes[type]}
                onClick={() => toggleType(type)}
                label={
                  enabled && !mutedTypes[type]
                    ? t("notifications.settings.on")
                    : t("notifications.settings.off")
                }
              />
            </Row>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Bell;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-sm">
        <Icon className="size-4 text-muted-foreground" />
        {label}
      </div>
      {children}
    </div>
  );
}
