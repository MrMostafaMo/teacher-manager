import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type DataTableColumn } from "@/shared/DataTable";
import { ConfirmDeleteButton } from "@/shared/ConfirmDeleteButton";
import { formatMoney } from "@/lib/utils/format";
import type { PlanWithCount } from "@/features/payments/infrastructure/plan-repo";
import type { Plan } from "@/lib/db/schema";

const intervalKey: Record<Plan["billingInterval"], string> = {
  monthly: "plans.monthly",
  term: "plans.term",
  yearly: "plans.yearly",
};

export function usePlansColumns(
  deletingId: string | null,
  onEdit: (plan: Plan) => void,
  onDelete: (plan: Plan) => void,
) {
  const { t } = useTranslation();
  return useMemo<DataTableColumn<PlanWithCount>[]>(
    () => [
      {
        header: t("plans.name"),
        className: "font-medium",
        render: (p) => p.name,
      },
      {
        header: t("plans.amount"),
        className: "tabular-nums",
        render: (p) => <span dir="ltr">{formatMoney(p.amount)}</span>,
      },
      {
        header: t("plans.interval"),
        render: (p) => <Badge variant="secondary">{t(intervalKey[p.billingInterval])}</Badge>,
      },
      {
        header: t("plans.subscribers"),
        className: "text-muted-foreground tabular-nums",
        render: (p) => p.memberCount,
      },
      {
        header: "",
        className: "text-end",
        headerClassName: "text-end",
        render: (p) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("plans.edit")}
              onClick={() => onEdit(p)}
            >
              <Pencil />
            </Button>
            <ConfirmDeleteButton
              armed={deletingId === p.id}
              deleteLabel={t("plans.delete")}
              confirmLabel={t("plans.confirmDelete")}
              onDelete={() => onDelete(p)}
            />
          </div>
        ),
      },
    ],
    [t, deletingId, onEdit, onDelete],
  );
}
