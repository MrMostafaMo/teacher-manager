import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PaymentHistoryRow } from "@/features/payments/application/payment-cases";
import { getPaymentReceiptData } from "@/features/payments/application/receipt-data";
import { exportReceiptPdf } from "@/features/payments/application/receipt-export";
import { receiptRows, type ReceiptLabels } from "@/features/payments/application/receipt-rows";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { toast } from "@/lib/toast-store";

const RECEIPT_METHOD_KEYS: Record<string, string> = {
  cash: "payments.cash",
  card: "payments.card",
  transfer: "payments.transfer",
};

/**
 * Drives a single payment's receipt export from the history table: builds the
 * localized PDF data from the row, exports it, and reports success/error.
 * Tracks the busy row id so the table can disable its button while exporting.
 */
export function usePaymentReceipt() {
  const { t } = useTranslation();
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = useCallback(
    async (row: PaymentHistoryRow) => {
      setBusyId(row.payment.id);
      try {
        const receipt = getPaymentReceiptData(row);
        const labels: ReceiptLabels = {
          student: t("payments.student"),
          plan: t("payments.plan"),
          period: t("payments.period"),
          method: t("payments.method"),
          date: t("payments.date"),
          note: t("payments.note"),
          amount: t("payments.amount"),
        };
        const lines = receiptRows({
          labels,
          studentName: receipt.studentName,
          planName: receipt.planName,
          period: receipt.payment.period,
          note: receipt.payment.note,
          method: t(RECEIPT_METHOD_KEYS[receipt.payment.method] ?? "payments.cash"),
          date: formatDate(new Date(receipt.payment.paidAt), "DD-MM-YYYY"),
          amount: formatMoney(receipt.payment.amount),
        });
        await exportReceiptPdf({
          title: t("payments.receiptTitle"),
          footer: t("payments.receiptFooter"),
          rtl: document.documentElement.dir === "rtl",
          lines,
        });
        toast(t("payments.receiptSaved"));
      } catch (e) {
        console.error("Failed to export receipt", e);
        toast(t("payments.receiptError"), "error");
      } finally {
        setBusyId(null);
      }
    },
    [t],
  );

  return { busyId, run };
}
