import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SessionDuesRow } from "@/features/payments/application/session-dues";
import { formatMoney } from "@/lib/utils/format";
import type { DataTableColumn } from "@/shared/DataTable";
import { Minus, Plus } from "lucide-react";

export function sessionColumns(
  t: (k: string, o?: Record<string, unknown>) => string,
  onRecord: (row: SessionDuesRow) => void,
  onAdd?: (row: SessionDuesRow) => void,
  onRemove?: (row: SessionDuesRow) => void,
  busyId?: string | null,
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
      header: t("payments.sessions.adjust"),
      render: (r) => {
        const busy = busyId === r.student.id;
        const atZero = (Number(r.count) || 0) <= 0;
        if (!onAdd || !onRemove) return null;
        return (
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              aria-label={t("payments.sessions.removeSession")}
              disabled={busy || atZero}
              onClick={() => onRemove(r)}
            >
              <Minus className="size-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              aria-label={t("payments.sessions.addSession")}
              disabled={busy}
              onClick={() => onAdd(r)}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        );
      },
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
