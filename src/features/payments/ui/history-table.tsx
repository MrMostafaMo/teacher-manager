import { memo, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PaymentHistoryRow } from "@/features/payments/application/payment-cases";
import type { Payment } from "@/lib/db/schema";
import { formatMoney } from "@/lib/utils/format";
import { DataTable, type DataTableColumn } from "@/shared/DataTable";

export const methodKey: Record<string, string> = {
  cash: "payments.cash",
  card: "payments.card",
  transfer: "payments.transfer",
};

export const HistoryTable = memo(function HistoryTable({
  list,
  deletingId,
  onEdit,
  onDelete,
}: {
  list: PaymentHistoryRow[];
  deletingId: string | null;
  onEdit: (payment: Payment) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const columns = useMemo<DataTableColumn<PaymentHistoryRow>[]>(
    () => [
      {
        header: t("payments.student"),
        className: "font-medium",
        render: ({ studentName }) => studentName,
      },
      {
        header: t("payments.plan"),
        className: "text-muted-foreground",
        render: ({ planName }) => planName ?? "—",
      },
      {
        header: t("payments.period"),
        className: "text-muted-foreground",
        render: ({ payment }) => <span dir="ltr">{payment.period}</span>,
      },
      {
        header: t("payments.amount"),
        className: "font-medium tabular-nums",
        render: ({ payment }) => <span dir="ltr">{formatMoney(payment.amount)}</span>,
      },
      {
        header: t("payments.method"),
        render: ({ payment }) => (
          <Badge variant="secondary">
            {t(methodKey[payment.method] ?? "payments.cash")}
          </Badge>
        ),
      },
      {
        header: "",
        className: "text-end",
        headerClassName: "text-end",
        render: ({ payment }) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("payments.edit")}
              onClick={() => onEdit(payment)}
            >
              <Pencil />
            </Button>
            <Button
              variant={deletingId === payment.id ? "destructive" : "ghost"}
              size="icon-sm"
              aria-label={
                deletingId === payment.id ? t("payments.confirmDelete") : t("payments.delete")
              }
              onClick={() => void onDelete(payment.id)}
            >
              <Trash2 />
            </Button>
          </div>
        ),
      },
    ],
    [t, deletingId, onEdit, onDelete],
  );
  const getRowKey = useCallback((row: PaymentHistoryRow) => row.payment.id, []);
  return (
    <DataTable<PaymentHistoryRow> columns={columns} rows={list} getRowKey={getRowKey} />
  );
});
