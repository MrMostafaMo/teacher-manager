import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { CalendarCheck, Receipt, UserPlus, Wallet, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/shared/PageHeader";
import { useDialogStore } from "@/lib/dialog-store";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils/format";
import { useTeacherProfile } from "@/features/teacher-profile/application/use-teacher-profile";

export function DashboardQuickActions({ newStudents }: { newStudents: number }) {
  const { t } = useTranslation();
  const openDialog = useDialogStore((s) => s.openDialog);
  const { name } = useTeacherProfile();
  const title = (
    <span className="text-gradient">
      {name ? t("dashboard.welcomeWithName", { name }) : t("dashboard.welcome")}
    </span>
  );
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <PageHeader title={title} description={t("dashboard.subtitle")} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/10 px-3 py-1.5 text-xs text-muted-foreground">
          <UserPlus className="size-3.5 text-primary" />
          {t("dashboard.newStudents.label")}:{" "}
          <span className="font-semibold tabular-nums text-foreground" dir="ltr">
            {formatNumber(newStudents)}
          </span>
          <span>{t("dashboard.newStudents.suffix")}</span>
        </span>
        {(
          [
            { key: "students", icon: UserPlus, dialog: "student" as const, iconColor: "text-blue-500" },
            { key: "attendance", icon: CalendarCheck, to: "/attendance" as const, iconColor: "text-green-500" },
            { key: "payments", icon: Wallet, dialog: "payment" as const, iconColor: "text-amber-500" },
            { key: "expenses", icon: Receipt, dialog: "expense" as const, iconColor: "text-rose-500" },
          ] as Array<
            | { key: string; icon: LucideIcon; dialog: "student" | "payment" | "expense"; iconColor: string }
            | { key: string; icon: LucideIcon; to: string; iconColor: string }
          >
        ).map(({ key, icon: Icon, iconColor, ...rest }) =>
          "to" in rest ? (
            <Button key={key} variant="outline" size="sm" className="transition-transform hover:-translate-y-0.5 motion-reduce:transition-none" asChild>
              <Link to={rest.to}>
                <Icon className={cn("size-3.5", iconColor)} />
                {t(`dashboard.quick.${key}`)}
              </Link>
            </Button>
          ) : (
            <Button key={key} variant="outline" size="sm" className="transition-transform hover:-translate-y-0.5 motion-reduce:transition-none" onClick={() => openDialog(rest.dialog)}>
              <Icon className={cn("size-3.5", iconColor)} />
              {t(`dashboard.quick.${key}`)}
            </Button>
          ),
        )}
      </div>
    </div>
  );
}
