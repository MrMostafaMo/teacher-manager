import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CreditCard, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardSkeleton } from "@/shared/Skeletons";
import { EmptyState } from "@/shared/EmptyState";
import { DataTable } from "@/shared/DataTable";
import { deletePlan, listPlans } from "@/features/payments/application/plan-cases";
import type { PlanWithCount } from "@/features/payments/infrastructure/plan-repo";
import type { Plan } from "@/lib/db/schema";
import { Modal } from "@/shared/Modal";
import { useConfirmDelete } from "@/shared/useConfirmDelete";
import { notifyUndo } from "@/lib/undo-store";
import { PlanFormDialog } from "./PlanFormDialog";
import { usePlansColumns } from "./plans-columns";

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
  const { armed: deletingId, request, clear } = useConfirmDelete();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    clear();
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

  const openEdit = useCallback((plan: Plan) => {
    setEditing(plan);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (plan: Plan) => {
      if (!request(plan.id)) return;
      try {
        const undoId = await deletePlan(plan.id);
        setRows((r) => r.filter((p) => p.id !== plan.id));
        onChanged();
        if (undoId !== null) {
          notifyUndo(undoId, t("undo.deleted"), `${t("undo.plan")}: ${plan.name}`, t("undo.undo"));
        }
      } catch (e) {
        console.error("Failed to delete plan", e);
        setError(t("plans.deleteError"));
      } finally {
        clear();
      }
    },
    [request, clear, onChanged, t],
  );

  const columns = usePlansColumns(deletingId, openEdit, (plan) => void handleDelete(plan));
  const getRowKey = useCallback((p: PlanWithCount) => p.id, []);

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
              <EmptyState
                icon={CreditCard}
                title={t("plans.empty")}
                description={t("plans.emptyHint")}
                className="py-14"
              />
            ) : (
              <DataTable<PlanWithCount> columns={columns} rows={rows} getRowKey={getRowKey} />
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
