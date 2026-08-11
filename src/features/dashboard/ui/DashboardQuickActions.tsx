import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { CalendarCheck, Receipt, UserPlus, Wallet, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/shared/PageHeader";
import { useDialogStore } from "@/lib/dialog-store";
import { formatNumber } from "@/lib/utils/format";

export function DashboardQuickActions({ newStudents }: { newStudents: number }) {
  const { t } = useTranslation();
  const openDialog = useDialogStore((s) => s.openDialog);
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <PageHeader title={t("dashboard.welcome")} description={t("dashboard.subtitle")} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-lg border bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground">
          <UserPlus className="size-3.5 text-primary" />
          {t("dashboard.newStudents.label")}:{" "}
          <span className="font-semibold tabular-nums text-foreground" dir="ltr">
            {formatNumber(newStudents)}
          </span>
          <span>{t("dashboard.newStudents.suffix")}</span>
        </span>
        {(
          [
            { key: "students", icon: UserPlus, dialog: "student" as const },
            { key: "attendance", icon: CalendarCheck, to: "/attendance" as const },
            { key: "payments", icon: Wallet, dialog: "payment" as const },
            { key: "expenses", icon: Receipt, dialog: "expense" as const },
          ] as Array<
            | { key: string; icon: LucideIcon; dialog: "student" | "payment" | "expense" }
            | { key: string; icon: LucideIcon; to: string }
          >
        ).map(({ key, icon: Icon, ...rest }) =>
          "to" in rest ? (
            <Button key={key} variant="outline" size="sm" asChild>
              <Link to={rest.to}>
                <Icon className="size-3.5" />
                {t(`dashboard.quick.${key}`)}
              </Link>
            </Button>
          ) : (
            <Button key={key} variant="outline" size="sm" onClick={() => openDialog(rest.dialog)}>
              <Icon className="size-3.5" />
              {t(`dashboard.quick.${key}`)}
            </Button>
          ),
        )}
      </div>
    </div>
  );
}
