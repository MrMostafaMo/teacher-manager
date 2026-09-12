import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SessionDuesRow } from "@/features/payments/application/session-dues";
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
        const total = c + (Number(r.remainingSessions) || 0);
        if (!Number.isFinite(total) || total <= 0) return <span dir="ltr">{`${c}/8`}</span>;
        return <span dir="ltr">{`${c}/${total}`}</span>;
      },
    },
    {
      header: t("payments.sessions.cycle"),
      render: (r) => <span className="tabular-nums">{r.cycleNumber}</span>,
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
      header: t("payments.paid"),
      render: (r) =>
        r.isPaid ? (
          <Badge variant="outline" className="border-success/40 text-success">
            {t("payments.sessions.paid")}
          </Badge>
        ) : (
          <Badge variant="outline" className="border-destructive/40 text-destructive">
            {t("payments.sessions.unpaid")}
          </Badge>
        ),
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
