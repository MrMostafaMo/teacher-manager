import { memo, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Receipt, Trash2 } from "lucide-react";
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
  receiptBusyId,
  onEdit,
  onDelete,
  onReceipt,
}: {
  list: PaymentHistoryRow[];
  deletingId: string | null;
  receiptBusyId: string | null;
  onEdit: (payment: Payment) => void;
  onDelete: (id: string) => void;
  onReceipt: (row: PaymentHistoryRow) => void;
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
        render: (row) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("payments.receipt")}
              disabled={receiptBusyId === row.payment.id}
              onClick={() => onReceipt(row)}
            >
              <Receipt />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("payments.edit")}
              onClick={() => onEdit(row.payment)}
            >
              <Pencil />
            </Button>
            <Button
              variant={deletingId === row.payment.id ? "destructive" : "ghost"}
              size="icon-sm"
              aria-label={
                deletingId === row.payment.id ? t("payments.confirmDelete") : t("payments.delete")
              }
              onClick={() => void onDelete(row.payment.id)}
            >
              <Trash2 />
            </Button>
          </div>
        ),
      },
    ],
    [t, deletingId, receiptBusyId, onEdit, onDelete, onReceipt],
  );
  const getRowKey = useCallback((row: PaymentHistoryRow) => row.payment.id, []);
  return (
    <DataTable<PaymentHistoryRow> columns={columns} rows={list} getRowKey={getRowKey} />
  );
});
