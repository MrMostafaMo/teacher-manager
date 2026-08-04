import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { CreditCard, History, PiggyBank, Plus, Trash2, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  deletePayment,
  listPaymentHistory,
  monthlyDues,
  type DuesRow,
  type PaymentHistoryRow,
} from "@/features/payments/application/payment-cases";
import { listStudents } from "@/features/students/application/student-cases";
import type { Student } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { RecordPaymentDialog } from "./RecordPaymentDialog";
import { PlansDialog } from "./PlansDialog";

const inputClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring";

export default function PaymentsPage() {
  const { t } = useTranslation();
  const [view, setView] = useState<"dues" | "history">("dues");
  const [month, setMonth] = useState(() => dayjs().format("YYYY-MM"));
  const [recordOpen, setRecordOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const bump = useCallback(() => setReloadKey((k) => k + 1), []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">{t("nav.payments")}</h2>
          <p className="text-sm text-muted-foreground">{t("payments.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            {(["dues", "history"] as const).map((v) => (
              <Button
                key={v}
                variant={view === v ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setView(v)}
              >
                {t(`payments.tab${v === "dues" ? "Dues" : "History"}`)}
              </Button>
            ))}
          </div>
          <Button onClick={() => setRecordOpen(true)}>
            <Plus />
            {t("payments.record")}
          </Button>
          <Button variant="outline" onClick={() => setPlansOpen(true)}>
            <CreditCard />
            {t("payments.managePlans")}
          </Button>
        </div>
      </div>

      {view === "dues" ? (
        <DuesView month={month} onMonthChange={setMonth} reloadKey={reloadKey} />
      ) : (
        <HistoryView reloadKey={reloadKey} onChanged={bump} />
      )}

      <RecordPaymentDialog
        open={recordOpen}
        defaultPeriod={month}
        onClose={() => setRecordOpen(false)}
        onSaved={bump}
      />
      <PlansDialog open={plansOpen} onClose={() => setPlansOpen(false)} onChanged={bump} />
    </div>
  );
}

function DuesView({
  month,
  onMonthChange,
  reloadKey,
}: {
  month: string;
  onMonthChange: (m: string) => void;
  reloadKey: number;
}) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<DuesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    monthlyDues(month)
      .then(setRows)
      .catch((e) => {
        console.error("Failed to load monthly dues", e);
        setError(t("payments.loadError"));
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [month, reloadKey, t]);

  const totals = useCallback(
    () => rows.reduce((acc, r) => acc + Math.max(r.remaining, 0), 0),
    [rows],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          {t("payments.month")}
          <input
            type="month"
            value={month}
            onChange={(e) => e.target.value && onMonthChange(e.target.value)}
            className={inputClass}
          />
        </label>
        <Badge variant="secondary">
          <Wallet className="size-3.5" />
          {t("payments.remaining")}: {totals()}
        </Badge>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              {t("students.loading")}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
                <PiggyBank className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">{t("payments.emptyDues")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-start font-medium">{t("payments.student")}</th>
                    <th className="px-4 py-2.5 text-start font-medium">{t("payments.plan")}</th>
                    <th className="px-4 py-2.5 text-start font-medium">{t("payments.due")}</th>
                    <th className="px-4 py-2.5 text-start font-medium">{t("payments.paid")}</th>
                    <th className="px-4 py-2.5 text-start font-medium">{t("payments.remaining")}</th>
                    <th className="px-4 py-2.5 text-start font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const status =
                      r.due === 0 ? "noPlan" : r.remaining <= 0 ? "paid" : "outstanding";
                    return (
                      <tr key={r.student.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="px-4 py-2.5 font-medium">{r.student.name}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {r.plan ? r.plan.name : "—"}
                        </td>
                        <td className="px-4 py-2.5" dir="ltr">
                          {r.due > 0 ? r.due : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-emerald-600 dark:text-emerald-400" dir="ltr">
                          {r.paid > 0 ? r.paid : "—"}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-2.5",
                            r.remaining > 0 && "text-destructive",
                          )}
                          dir="ltr"
                        >
                          {r.due > 0 ? Math.max(r.remaining, 0) : "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex justify-end">
                            <DuesBadge status={status} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DuesBadge({ status }: { status: "noPlan" | "paid" | "outstanding" }) {
  const { t } = useTranslation();
  if (status === "noPlan") {
    return (
      <Badge variant="secondary">{t("payments.noPlan")}</Badge>
    );
  }
  if (status === "paid") {
    return (
      <Badge className="border-emerald-600 bg-emerald-600/15 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
        {t("payments.fullyPaid")}
      </Badge>
    );
  }
  return <Badge variant="destructive">{t("payments.outstanding")}</Badge>;
}

function HistoryView({
  reloadKey,
  onChanged,
}: {
  reloadKey: number;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<PaymentHistoryRow[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    void listStudents()
      .then(setStudents)
      .catch(() => setStudents([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    listPaymentHistory({ studentId: studentId || undefined })
      .then(setRows)
      .catch((e) => {
        console.error("Failed to load payment history", e);
        setError(t("payments.loadError"));
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [studentId, reloadKey, t]);

  async function handleDelete(id: string) {
    if (deletingId !== id) {
      setDeletingId(id);
      setTimeout(() => setDeletingId((cur) => (cur === id ? null : cur)), 2500);
      return;
    }
    try {
      await deletePayment(id);
      setRows((r) => r.filter((p) => p.payment.id !== id));
      onChanged();
    } catch (e) {
      console.error("Failed to delete payment", e);
      setError(t("payments.deleteError"));
    } finally {
      setDeletingId(null);
    }
  }

  const methodKey: Record<string, string> = {
    cash: "payments.cash",
    card: "payments.card",
    transfer: "payments.transfer",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          aria-label={t("payments.student")}
          className={inputClass}
        >
          <option value="">{t("payments.allStudents")}</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              {t("students.loading")}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
                <History className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">{t("payments.emptyHistory")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-start font-medium">{t("payments.student")}</th>
                    <th className="px-4 py-2.5 text-start font-medium">{t("payments.plan")}</th>
                    <th className="px-4 py-2.5 text-start font-medium">{t("payments.period")}</th>
                    <th className="px-4 py-2.5 text-start font-medium">{t("payments.amount")}</th>
                    <th className="px-4 py-2.5 text-start font-medium">{t("payments.method")}</th>
                    <th className="px-4 py-2.5 text-start font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ payment, studentName, planName }) => (
                    <tr
                      key={payment.id}
                      className="border-b last:border-0 hover:bg-muted/50"
                    >
                      <td className="px-4 py-2.5 font-medium">{studentName}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{planName ?? "—"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground" dir="ltr">
                        {payment.period}
                      </td>
                      <td className="px-4 py-2.5 font-medium" dir="ltr">
                        {payment.amount}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="secondary">{t(methodKey[payment.method] ?? "payments.cash")}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant={deletingId === payment.id ? "destructive" : "ghost"}
                            size="icon-sm"
                            aria-label={
                              deletingId === payment.id
                                ? t("payments.confirmDelete")
                                : t("payments.delete")
                            }
                            onClick={() => void handleDelete(payment.id)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
