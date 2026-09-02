import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { type DataTableColumn } from "@/shared/DataTable";
import { formatDate, formatDateString, formatMoney } from "@/lib/utils/format";
import { isOverdue } from "@/features/homework/application/homework-stats";
import type { Attendance } from "@/lib/db/schema";
import type { PaymentHistoryRow } from "@/features/payments/application/payment-cases";
import type { ProfileHomework } from "@/features/student-profile/application/student-profile-cases";
import {
  PAYMENT_METHOD_LABEL,
  STATUS_BADGE,
  STATUS_LABEL,
  SUBMISSION_BADGE,
  SUBMISSION_LABEL,
} from "./profile-constants";

export function useAttendanceColumns(): DataTableColumn<Attendance>[] {
  const { t } = useTranslation();
  return useMemo(
    () => [
      {
        header: t("profile.columns.date"),
        className: "text-muted-foreground tabular-nums",
        render: (r) => <span dir="ltr">{formatDateString(r.date)}</span>,
      },
      {
        header: t("profile.columns.status"),
        render: (r) => <Badge className={STATUS_BADGE[r.status]}>{t(STATUS_LABEL[r.status])}</Badge>,
      },
    ],
    [t],
  );
}

export function usePaymentColumns(): DataTableColumn<PaymentHistoryRow>[] {
  const { t } = useTranslation();
  return useMemo(
    () => [
      {
        header: t("profile.columns.date"),
        className: "text-muted-foreground tabular-nums",
        render: ({ payment }) => <span dir="ltr">{formatDate(payment.paidAt)}</span>,
      },
      {
        header: t("profile.columns.period"),
        className: "text-muted-foreground",
        render: ({ payment }) => <span dir="ltr">{payment.period ?? "—"}</span>,
      },
      {
        header: t("profile.columns.amount"),
        className: "font-medium tabular-nums",
        render: ({ payment }) => <span dir="ltr">{formatMoney(payment.amount)}</span>,
      },
      {
        header: t("profile.columns.method"),
        render: ({ payment }) => (
          <Badge variant="secondary">
            {t(PAYMENT_METHOD_LABEL[payment.method] ?? "payments.cash")}
          </Badge>
        ),
      },
    ],
    [t],
  );
}

export function useHomeworkColumns(): DataTableColumn<ProfileHomework>[] {
  const { t } = useTranslation();
  return useMemo(
    () => [
      {
        header: t("profile.columns.title"),
        className: "font-medium",
        render: (h) => h.title,
      },
      {
        header: t("profile.columns.group"),
        className: "text-muted-foreground",
        render: (h) => h.groupName ?? "—",
      },
      {
        header: t("profile.columns.dueDate"),
        className: "text-muted-foreground tabular-nums",
        render: (h) => <span dir="ltr">{h.dueDate ? formatDateString(h.dueDate) : "—"}</span>,
      },
      {
        header: t("profile.columns.status"),
        render: (h) => {
          const overdue = isOverdue({
            dueDate: h.dueDate,
            pending: h.status === "pending" ? 1 : 0,
          });
          return (
            <Badge
              className={overdue ? "bg-destructive/10 text-destructive" : SUBMISSION_BADGE[h.status]}
            >
              {overdue ? t("homework.statusOverdue") : t(SUBMISSION_LABEL[h.status])}
            </Badge>
          );
        },
      },
    ],
    [t],
  );
}
