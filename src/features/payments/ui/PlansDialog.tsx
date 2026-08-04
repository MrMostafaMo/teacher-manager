import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CreditCard, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deletePlan, listPlans } from "@/features/payments/application/plan-cases";
import type { PlanWithCount } from "@/features/payments/infrastructure/plan-repo";
import type { Plan } from "@/lib/db/schema";
import { Modal } from "@/features/students/ui/Modal";
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
              <div className="p-10 text-center text-sm text-muted-foreground">
                {t("plans.loading")}
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
                <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
                  <CreditCard className="size-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">{t("plans.empty")}</p>
                <p className="text-sm text-muted-foreground">{t("plans.emptyHint")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="px-4 py-2.5 text-start font-medium">{t("plans.name")}</th>
                      <th className="px-4 py-2.5 text-start font-medium">{t("plans.amount")}</th>
                      <th className="px-4 py-2.5 text-start font-medium">{t("plans.interval")}</th>
                      <th className="px-4 py-2.5 text-start font-medium">{t("plans.subscribers")}</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="px-4 py-2.5 font-medium">{p.name}</td>
                        <td className="px-4 py-2.5" dir="ltr">
                          {p.amount}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant="secondary">{t(intervalKey[p.billingInterval])}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{p.memberCount}</td>
                        <td className="px-4 py-2.5">
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
                              aria-label={
                                deletingId === p.id ? t("plans.confirmDelete") : t("plans.delete")
                              }
                              onClick={() => void handleDelete(p)}
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
