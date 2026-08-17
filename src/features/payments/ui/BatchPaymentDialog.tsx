import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, SquareCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { listPlans } from "@/features/payments/application/plan-cases";
import { listStudents } from "@/features/students/application/student-cases";
import { recordBatchPayments } from "@/features/payments/application/batch-cases";
import { Avatar } from "@/shared/Avatar";
import { Modal } from "@/shared/Modal";
import { useSaveFeedback } from "@/shared/useSaveFeedback";
import { formatMoney } from "@/lib/utils/format";
import type { PaymentMethod, BatchRow } from "./batch-form";
import { buildBatchRows } from "./batch-form";

const METHODS = ["cash", "card", "transfer"] as const;

interface Props {
  open: boolean;
  defaultPeriod: string;
  onClose: () => void;
  onSaved: () => void;
}

export function BatchPaymentDialog({ open, defaultPeriod, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [period, setPeriod] = useState(defaultPeriod);
  const { saving, saved, run } = useSaveFeedback();

  useEffect(() => {
    if (!open) return;
    setPeriod(defaultPeriod);
    Promise.all([listStudents({ status: "active" }), listPlans()])
      .then(([students, plans]) => setRows(buildBatchRows(students, plans)))
      .catch(() => setRows([]));
  }, [open, defaultPeriod]);

  function toggleAll() {
    const allChecked = rows.every((r) => r.checked);
    setRows((rs) => rs.map((r) => ({ ...r, checked: allChecked ? false : true })));
  }

  function toggle(idx: number) {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, checked: !r.checked } : r)));
  }

  function updateField<K extends keyof BatchRow>(idx: number, key: K, value: BatchRow[K]) {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  }

  async function handleSave() {
    const checked = rows.filter((r) => r.checked && r.amount > 0);
    if (checked.length === 0) return;
    await run(async () => {
      await recordBatchPayments(
        checked.map((r) => ({ studentId: r.studentId, planId: r.planId, amount: r.amount, method: r.method })),
        period,
      );
      onSaved();
      onClose();
    });
  }

  const allChecked = rows.length > 0 && rows.every((r) => r.checked);
  const methodLabel = (m: PaymentMethod) => t(`payments.${m}`);

  return (
    <Modal open={open} onClose={onClose} title={t("payments.batchRecord")} className="max-w-3xl">
      <div className="mb-3 flex items-center gap-3">
        <label className="text-sm font-medium">{t("payments.period")}</label>
        <Input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="w-40"
          dir="ltr"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 pr-2">
                <button type="button" onClick={toggleAll} className="cursor-pointer" aria-label={t("payments.batch.selectAll")}>
                  {allChecked ? <Check className="size-4" /> : <SquareCheck className="size-4" />}
                </button>
              </th>
              <th className="pb-2 pr-4">{t("payments.batch.selectStudent")}</th>
              <th className="pb-2 pr-4">{t("payments.batch.amount")}</th>
              <th className="pb-2 pr-4">{t("payments.batch.method")}</th>
              <th className="pb-2">{t("payments.batch.plan")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.studentId} className="border-b last:border-0">
                <td className="py-2 pr-2">
                  <input
                    type="checkbox"
                    checked={r.checked}
                    onChange={() => toggle(i)}
                    className="size-4 cursor-pointer accent-primary"
                  />
                </td>
                <td className="flex items-center gap-2 py-2 pr-4">
                  <Avatar name={r.name} className="size-7 text-xs" />
                  {r.name}
                </td>
                <td className="py-2 pr-4">
                  <Input
                    type="number"
                    min={0}
                    dir="ltr"
                    value={r.amount || ""}
                    onChange={(e) => updateField(i, "amount", Number(e.target.value) || 0)}
                    className="h-8 w-24"
                  />
                </td>
                <td className="py-2 pr-4">
                  <Select value={r.method} onChange={(e) => updateField(i, "method", e.target.value as PaymentMethod)} className="h-8 w-32">
                    {METHODS.map((m) => (
                      <option key={m} value={m}>{methodLabel(m)}</option>
                    ))}
                  </Select>
                </td>
                <td className="py-2 text-muted-foreground">
                  {r.planName ? `${r.planName} (${formatMoney(r.amount)})` : t("payments.batch.noneWithPlan")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && <p className="py-8 text-center text-muted-foreground">{t("payments.batch.noneWithPlan")}</p>}
      <div className="mt-4 flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>{t("payments.cancel")}</Button>
        <Button type="button" onClick={handleSave} disabled={saving || rows.every((r) => !r.checked || r.amount <= 0)}>
          <Wallet className="me-1.5 size-4" />
          {saving ? t("payments.saving") : saved ? t("payments.batch.saved") : t("payments.batchRecord")}
        </Button>
      </div>
    </Modal>
  );
}
