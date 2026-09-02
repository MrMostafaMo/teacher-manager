import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/shared/DataTable";
import { formatDate, formatMoney } from "@/lib/utils/format";
import type {
  StatementPayment,
  StudentStatement,
} from "@/features/payments/application/payment-cases";

export function displayPeriod(period: string): string {
  return period.split("-").reverse().join("-");
}

export function StatementMonthlyTable({ data }: { data: StudentStatement }) {
  const { t } = useTranslation();
  const monthlyColumns = useMemo(
    () => [
      {
        header: t("profile.statement.month"),
        className: "tabular-nums",
        render: (m: StudentStatement["months"][number]) => <span dir="ltr">{displayPeriod(m.period)}</span>,
      },
      {
        header: t("payments.due"),
        className: "tabular-nums",
        render: (m: StudentStatement["months"][number]) => <span dir="ltr">{formatMoney(m.due)}</span>,
      },
      {
        header: t("payments.paid"),
        className: "tabular-nums",
        render: (m: StudentStatement["months"][number]) => <span dir="ltr">{formatMoney(m.paid)}</span>,
      },
      {
        header: t("profile.statement.balance"),
        className: "tabular-nums",
        render: (m: StudentStatement["months"][number]) => <span dir="ltr">{formatMoney(m.balance)}</span>,
      },
      {
        header: t("profile.statement.running"),
        className: "tabular-nums",
        render: (m: StudentStatement["months"][number]) => <span dir="ltr">{formatMoney(m.running)}</span>,
      },
    ],
    [t],
  );
  const getMonthlyKey = useCallback((m: StudentStatement["months"][number]) => m.period, []);
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{t("profile.statement.monthly")}</h3>
      <DataTable
        columns={monthlyColumns}
        rows={data.months}
        getRowKey={getMonthlyKey}
        className="max-h-64 overflow-y-auto rounded-lg border"
      />
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          {t("profile.statement.totalDue")}: {formatMoney(data.totalDue)}
        </span>
        <span>
          {t("profile.statement.totalPaid")}: {formatMoney(data.totalPaid)}
        </span>
        <span>
          {t("profile.statement.totalBalance")}: {formatMoney(data.totalBalance)}
        </span>
      </p>
    </div>
  );
}

export function StatementLedger({ payments }: { payments: StatementPayment[] }) {
  const { t } = useTranslation();
  const ledgerColumns = useMemo(
    () => [
      {
        header: t("profile.columns.date"),
        className: "tabular-nums",
        render: (p: StatementPayment) => <span dir="ltr">{formatDate(p.payment.paidAt, "DD-MM-YYYY")}</span>,
      },
      {
        header: t("profile.columns.period"),
        className: "tabular-nums",
        render: (p: StatementPayment) =>
          p.payment.period ? <span dir="ltr">{displayPeriod(p.payment.period)}</span> : "—",
      },
      {
        header: t("profile.columns.method"),
        render: (p: StatementPayment) => t(`payments.${p.payment.method}`),
      },
      {
        header: t("profile.columns.amount"),
        className: "tabular-nums",
        render: (p: StatementPayment) => <span dir="ltr">{formatMoney(p.payment.amount)}</span>,
      },
      {
        header: t("profile.statement.running"),
        className: "tabular-nums",
        render: (p: StatementPayment) => <span dir="ltr">{formatMoney(p.cumulativePaid)}</span>,
      },
      {
        header: t("payments.note"),
        render: (p: StatementPayment) => p.payment.note ?? "—",
      },
    ],
    [t],
  );
  const getLedgerKey = useCallback((p: StatementPayment) => p.payment.id, []);
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{t("profile.statement.ledger")}</h3>
      {payments.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {t("profile.statement.empty")}
        </p>
      ) : (
        <DataTable
          columns={ledgerColumns}
          rows={payments}
          getRowKey={getLedgerKey}
          className="max-h-64 overflow-y-auto rounded-lg border"
        />
      )}
    </div>
  );
}
