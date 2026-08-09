import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CreditCard, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardSkeleton } from "@/shared/Skeletons";
import { EmptyState } from "@/shared/EmptyState";
import { DataTable, type DataTableColumn } from "@/shared/DataTable";
import { deletePlan, listPlans } from "@/features/payments/application/plan-cases";
import type { PlanWithCount } from "@/features/payments/infrastructure/plan-repo";
import type { Plan } from "@/lib/db/schema";
import { Modal } from "@/shared/Modal";
import { formatMoney } from "@/lib/utils/format";
import { PlanFormDialog } from "./PlanFormDialog";

interface PlansDialogProps {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export function PlansDialog({ open, onClose, onChanged }: PlansDialogProps) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<PlanWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    setDeletingId(null);
    listPlans()
      .then(setRows)
      .catch((e) => {
        console.error("Failed to load plans", e);
        setError(t("plans.loadError"));
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [open, t]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(plan: Plan) {
    setEditing(plan);
    setFormOpen(true);
  }

  async function handleDelete(plan: Plan) {
    if (deletingId !== plan.id) {
      setDeletingId(plan.id);
      setTimeout(() => setDeletingId((cur) => (cur === plan.id ? null : cur)), 2500);
      return;
    }
    try {
      await deletePlan(plan.id);
      setRows((r) => r.filter((p) => p.id !== plan.id));
      onChanged();
    } catch (e) {
      console.error("Failed to delete plan", e);
      setError(t("plans.deleteError"));
    } finally {
      setDeletingId(null);
    }
  }

  const intervalKey: Record<Plan["billingInterval"], string> = {
    monthly: "plans.monthly",
    term: "plans.term",
    yearly: "plans.yearly",
  };

  const columns: DataTableColumn<PlanWithCount>[] = [
    {
      header: t("plans.name"),
      className: "font-medium",
      render: (p) => p.name,
    },
    {
      header: t("plans.amount"),
      className: "tabular-nums",
      render: (p) => <span dir="ltr">{formatMoney(p.amount)}</span>,
    },
    {
      header: t("plans.interval"),
      render: (p) => <Badge variant="secondary">{t(intervalKey[p.billingInterval])}</Badge>,
    },
    {
      header: t("plans.subscribers"),
      className: "text-muted-foreground tabular-nums",
      render: (p) => p.memberCount,
    },
    {
      header: "",
      className: "text-end",
      headerClassName: "text-end",
      render: (p) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("plans.edit")}
            onClick={() => openEdit(p)}
          >
            <Pencil />
          </Button>
          <Button
            variant={deletingId === p.id ? "destructive" : "ghost"}
            size="icon-sm"
            aria-label={deletingId === p.id ? t("plans.confirmDelete") : t("plans.delete")}
            onClick={() => void handleDelete(p)}
          >
            <Trash2 />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Modal open={open} onClose={onClose} title={t("plans.title")} className="max-w-2xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{t("plans.subtitle")}</p>
          <Button onClick={openCreate}>
            <Plus />
            {t("plans.add")}
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-4">
                <CardSkeleton lines={3} />
              </div>
            ) : rows.length === 0 ? (
              <EmptyState icon={CreditCard} title={t("plans.empty")} description={t("plans.emptyHint")} className="py-14" />
            ) : (
              <DataTable<PlanWithCount>
                columns={columns}
                rows={rows}
                getRowKey={(p) => p.id}
              />
            )}
          </CardContent>
        </Card>

        <PlanFormDialog
          open={formOpen}
          plan={editing}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            void listPlans()
              .then(setRows)
              .catch((e) => {
                console.error("Failed to reload plans", e);
                setError(t("plans.loadError"));
              });
            onChanged();
          }}
        />
      </div>
    </Modal>
  );
}
