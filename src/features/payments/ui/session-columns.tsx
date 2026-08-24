import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SessionDuesRow } from "@/features/payments/application/session-dues";
import { formatMoney } from "@/lib/utils/format";
import type { DataTableColumn } from "@/shared/DataTable";

export function sessionColumns(
  t: (k: string, o?: Record<string, unknown>) => string,
  onRecord: (row: SessionDuesRow) => void,
): DataTableColumn<SessionDuesRow>[] {
  return [
    {
      header: t("payments.student"),
      render: (r) => <span className="font-medium">{r.student.name}</span>,
    },
    {
      header: t("payments.sessions.count"),
      render: (r) => {
        const c = Number(r.count) || 0;
        const rem = Number(r.remainingSessions) || 0;
        const total = c + rem;
        return `${c}/${Number.isFinite(total) ? total : c}`;
      },
    },
    {
      header: t("payments.sessions.perSession"),
      render: (r) => (r.pricePerSession != null ? formatMoney(r.pricePerSession) : "—"),
    },
    {
      header: t("payments.sessions.remaining"),
      render: (r) => {
        if (r.pricePerSession == null) return `${r.remainingSessions}`;
        return `${r.remainingSessions} · ${formatMoney(r.remainingAmount ?? 0)}`;
      },
    },
    {
      header: t("payments.sessions.status"),
      render: (r) => {
        const label =
          r.status === "due"
            ? t("payments.sessions.due")
            : r.status === "warning"
              ? t("payments.sessions.warning")
              : t("payments.sessions.ok");
        const variant = r.status === "due" ? "destructive" : r.status === "warning" ? "secondary" : "outline";
        return <Badge variant={variant as never}>{label}</Badge>;
      },
    },
    {
      header: t("payments.sessions.lastPayment"),
      render: (r) => (r.lastPaidISO ? `${r.lastPaidISO.split("-").reverse().join("-")} · ${formatMoney(r.lastPaidAmount ?? 0)}` : "—"),
    },
    {
      header: "",
      render: (r) => (
        <Button size="sm" variant="outline" onClick={() => onRecord(r)}>
          {t("payments.record")}
        </Button>
      ),
    },
  ];
}
