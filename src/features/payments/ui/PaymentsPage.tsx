import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { CreditCard, History, Pencil, PiggyBank, Plus, Trash2, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  deletePayment,
  listPaymentHistory,
  monthlyDues,
  type DuesRow,
  type PaymentHistoryRow,
} from "@/features/payments/application/payment-cases";
import { listMemberships } from "@/features/groups/application/group-cases";
import { listStudents } from "@/features/students/application/student-cases";
import type { Payment, Student } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/utils/format";
import { CollapsibleSection } from "@/shared/CollapsibleSection";
import { Segmented } from "@/shared/Segmented";
import { MonthPicker } from "@/shared/DatePicker";
import { TableRowsSkeleton } from "@/shared/Skeletons";
import { EmptyState } from "@/shared/EmptyState";
import { DataTable, type DataTableColumn } from "@/shared/DataTable";
import { Avatar } from "@/shared/Avatar";
import { PageHeader } from "@/shared/PageHeader";
import { RecordPaymentDialog } from "./RecordPaymentDialog";
import { PlansDialog } from "./PlansDialog";

const inputClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring";

export default function PaymentsPage() {
  const { t } = useTranslation();
  const [view, setView] = useState<"dues" | "history">("dues");
  const [month, setMonth] = useState(() => dayjs().format("YYYY-MM"));
  const [recordOpen, setRecordOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [plansOpen, setPlansOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const bump = useCallback(() => setReloadKey((k) => k + 1), []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.payments")}
        description={t("payments.subtitle")}
        actions={
          <>
            <Segmented
              value={view}
              onChange={setView}
              options={(["dues", "history"] as const).map((v) => ({
                value: v,
                label: t(`payments.tab${v === "dues" ? "Dues" : "History"}`),
              }))}
              ariaLabel={t("payments.viewLabel")}
            />
            <Button onClick={() => {
              setEditing(null);
              setRecordOpen(true);
            }}>
              <Plus />
              {t("payments.record")}
            </Button>
            <Button variant="outline" onClick={() => setPlansOpen(true)}>
              <CreditCard />
              {t("payments.managePlans")}
            </Button>
          </>
        }
      />

      {view === "dues" ? (
        <DuesView month={month} onMonthChange={setMonth} reloadKey={reloadKey} />
      ) : (
        <HistoryView
          reloadKey={reloadKey}
          onChanged={bump}
          onEdit={(p) => {
            setEditing(p);
            setRecordOpen(true);
          }}
        />
      )}

      <RecordPaymentDialog
        open={recordOpen}
        defaultPeriod={month}
        payment={editing}
        onClose={() => {
          setRecordOpen(false);
          setEditing(null);
        }}
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
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

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

  const { sections, ungrouped } = useMemo(() => {
    const byGroup = new Map<string, { id: string; name: string; rows: DuesRow[] }>();
    const ungroupedRows: DuesRow[] = [];
    for (const r of rows) {
      if (r.groups.length === 0) {
        ungroupedRows.push(r);
        continue;
      }
      for (const g of r.groups) {
        let sec = byGroup.get(g.id);
        if (!sec) {
          sec = { id: g.id, name: g.name, rows: [] };
          byGroup.set(g.id, sec);
        }
        sec.rows.push(r);
      }
    }
    const sorted = [...byGroup.values()].sort((a, b) => a.name.localeCompare(b.name, "ar"));
    return { sections: sorted, ungrouped: ungroupedRows };
  }, [rows]);

  function subtotal(list: DuesRow[]) {
    return list.reduce((acc, r) => acc + Math.max(r.remaining, 0), 0);
  }

  function DuesTable({ list }: { list: DuesRow[] }) {
    const columns: DataTableColumn<DuesRow>[] = [
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
    ];
    return <DataTable<DuesRow> columns={columns} rows={list} getRowKey={(r) => r.student.id} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          {t("payments.month")}
          <MonthPicker
            value={month}
            onChange={(v) => v && onMonthChange(v)}
            ariaLabel={t("payments.month")}
            className={inputClass}
          />
        </label>
        <Badge variant="secondary">
          <Wallet className="size-3.5" />
          {t("payments.remaining")}: {formatMoney(totals())}
        </Badge>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <TableRowsSkeleton rows={5} cols={5} />
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState icon={PiggyBank} title={t("payments.emptyDues")} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sections.map((sec) => {
            const isCollapsed = !!collapsed[sec.id];
            return (
              <CollapsibleSection
                key={sec.id}
                title={sec.name}
                meta={`${sec.rows.length} · ${formatMoney(subtotal(sec.rows))}`}
                collapsed={isCollapsed}
                onToggle={() => setCollapsed((c) => ({ ...c, [sec.id]: !isCollapsed }))}
              >
                <DuesTable list={sec.rows} />
              </CollapsibleSection>
            );
          })}
          {ungrouped.length > 0 && (
            <CollapsibleSection
              key="__ungrouped"
              title={t("payments.ungrouped")}
              meta={`${ungrouped.length} · ${formatMoney(subtotal(ungrouped))}`}
              collapsed={!!collapsed.__ungrouped}
              onToggle={() =>
                setCollapsed((c) => ({ ...c, __ungrouped: !collapsed.__ungrouped }))
              }
            >
              <DuesTable list={ungrouped} />
            </CollapsibleSection>
          )}
        </div>
      )}
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
      <Badge className="border-success bg-success/15 text-success">
        {t("payments.fullyPaid")}
      </Badge>
    );
  }
  return <Badge variant="destructive">{t("payments.outstanding")}</Badge>;
}

function HistoryView({
  reloadKey,
  onChanged,
  onEdit,
}: {
  reloadKey: number;
  onChanged: () => void;
  onEdit: (payment: Payment) => void;
}) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<PaymentHistoryRow[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [groupsByStudent, setGroupsByStudent] = useState<
    Map<string, Array<{ id: string; name: string }>>
  >(new Map());
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void listStudents()
      .then(setStudents)
      .catch(() => setStudents([]));
  }, []);

  useEffect(() => {
    listMemberships()
      .then((m) => {
        const map = new Map<string, Array<{ id: string; name: string }>>();
        for (const x of m) {
          const arr = map.get(x.studentId) ?? [];
          arr.push({ id: x.groupId, name: x.groupName });
          map.set(x.studentId, arr);
        }
        setGroupsByStudent(map);
      })
      .catch(() => setGroupsByStudent(new Map()));
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

  function HistoryTable({ list }: { list: PaymentHistoryRow[] }) {
    const columns: DataTableColumn<PaymentHistoryRow>[] = [
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
              onClick={() => void handleDelete(payment.id)}
            >
              <Trash2 />
            </Button>
          </div>
        ),
      },
    ];
    return (
      <DataTable<PaymentHistoryRow>
        columns={columns}
        rows={list}
        getRowKey={(row) => row.payment.id}
      />
    );
  }

  const { sections, ungrouped } = (() => {
    const byGroup = new Map<string, { id: string; name: string; list: PaymentHistoryRow[] }>();
    const ungroupedList: PaymentHistoryRow[] = [];
    for (const row of rows) {
      const groups = groupsByStudent.get(row.payment.studentId) ?? [];
      if (groups.length === 0) {
        ungroupedList.push(row);
        continue;
      }
      for (const g of groups) {
        let sec = byGroup.get(g.id);
        if (!sec) {
          sec = { id: g.id, name: g.name, list: [] };
          byGroup.set(g.id, sec);
        }
        sec.list.push(row);
      }
    }
    const sorted = [...byGroup.values()].sort((a, b) => a.name.localeCompare(b.name, "ar"));
    return { sections: sorted, ungrouped: ungroupedList };
  })();

  function sectionTotal(list: PaymentHistoryRow[]) {
    return list.reduce((acc, r) => acc + r.payment.amount, 0);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          aria-label={t("payments.student")}
          className="w-auto shrink-0"
        >
          <option value="">{t("payments.allStudents")}</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <TableRowsSkeleton rows={5} cols={5} />
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState icon={History} title={t("payments.emptyHistory")} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sections.map((sec) => {
            const isCollapsed = !!collapsed[sec.id];
            return (
              <CollapsibleSection
                key={sec.id}
                title={sec.name}
                meta={`${sec.list.length} · ${formatMoney(sectionTotal(sec.list))}`}
                collapsed={isCollapsed}
                onToggle={() => setCollapsed((c) => ({ ...c, [sec.id]: !isCollapsed }))}
              >
                <HistoryTable list={sec.list} />
              </CollapsibleSection>
            );
          })}
          {ungrouped.length > 0 && (
            <CollapsibleSection
              key="__ungrouped"
              title={t("payments.ungrouped")}
              meta={`${ungrouped.length} · ${formatMoney(sectionTotal(ungrouped))}`}
              collapsed={!!collapsed.__ungrouped}
              onToggle={() =>
                setCollapsed((c) => ({ ...c, __ungrouped: !collapsed.__ungrouped }))
              }
            >
              <HistoryTable list={ungrouped} />
            </CollapsibleSection>
          )}
        </div>
      )}
    </div>
  );
}
