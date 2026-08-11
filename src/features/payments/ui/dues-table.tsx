import { memo, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { DuesRow } from "@/features/payments/application/payment-cases";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/utils/format";
import { DataTable, type DataTableColumn } from "@/shared/DataTable";
import { Avatar } from "@/shared/Avatar";

export const DuesTable = memo(function DuesTable({ list }: { list: DuesRow[] }) {
  const { t } = useTranslation();
  const columns = useMemo<DataTableColumn<DuesRow>[]>(
    () => [
      {
        header: t("payments.student"),
        className: "font-medium",
        render: (r) => (
          <span className="flex items-center gap-2.5">
            <Avatar name={r.student.name} className="size-8 text-xs" />
            {r.student.name}
          </span>
        ),
      },
      {
        header: t("payments.plan"),
        className: "text-muted-foreground",
        render: (r) => (r.plan ? r.plan.name : "—"),
      },
      {
        header: t("payments.due"),
        className: "tabular-nums",
        render: (r) => (r.due > 0 ? <span dir="ltr">{formatMoney(r.due)}</span> : "—"),
      },
      {
        header: t("payments.paid"),
        className: "tabular-nums text-success",
        render: (r) => (r.paid > 0 ? <span dir="ltr">{formatMoney(r.paid)}</span> : "—"),
      },
      {
        header: t("payments.remaining"),
        className: "tabular-nums",
        render: (r) =>
          r.due > 0 ? (
            <span dir="ltr" className={cn(r.remaining > 0 && "text-destructive")}>
              {formatMoney(Math.max(r.remaining, 0))}
            </span>
          ) : (
            "—"
          ),
      },
      {
        header: "",
        className: "text-end",
        headerClassName: "text-end",
        render: (r) => {
          const status =
            r.due === 0 ? "noPlan" : r.remaining <= 0 ? "paid" : "outstanding";
          return (
            <div className="flex justify-end">
              <DuesBadge status={status} />
            </div>
          );
        },
      },
    ],
    [t],
  );
  const getRowKey = useCallback((r: DuesRow) => r.student.id, []);
  return <DataTable<DuesRow> columns={columns} rows={list} getRowKey={getRowKey} />;
});

function DuesBadge({ status }: { status: "noPlan" | "paid" | "outstanding" }) {
  const { t } = useTranslation();
  if (status === "noPlan") {
    return <Badge variant="secondary">{t("payments.noPlan")}</Badge>;
  }
  if (status === "paid") {
    return (
      <Badge className="border-success bg-success/15 text-success">
        {t("payments.fullyPaid")}
      </Badge>
    );
  }
  return <Badge variant="destructive">{t("payments.outstanding")}</Badge>;
}
