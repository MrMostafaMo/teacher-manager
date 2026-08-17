import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { CreditCard, ListChecks, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Payment } from "@/lib/db/schema";
import { Segmented } from "@/shared/Segmented";
import { PageHeader } from "@/shared/PageHeader";
import { RecordPaymentDialog } from "./RecordPaymentDialog";
import { BatchPaymentDialog } from "./BatchPaymentDialog";
import { PlansDialog } from "./PlansDialog";
import { DuesView } from "./dues";
import { HistoryView } from "./history";

export default function PaymentsPage() {
  const { t } = useTranslation();
  const [view, setView] = useState<"dues" | "history">("dues");
  const [month, setMonth] = useState(() => dayjs().format("YYYY-MM"));
  const [recordOpen, setRecordOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [plansOpen, setPlansOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const bump = useCallback(() => setReloadKey((k) => k + 1), []);

  const handleEdit = useCallback((p: Payment) => {
    setEditing(p);
    setRecordOpen(true);
  }, []);

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
            <Button
              onClick={() => {
                setEditing(null);
                setRecordOpen(true);
              }}
            >
              <Plus />
              {t("payments.record")}
            </Button>
            <Button variant="outline" onClick={() => setPlansOpen(true)}>
              <CreditCard />
              {t("payments.managePlans")}
            </Button>
            <Button variant="outline" onClick={() => setBatchOpen(true)}>
              <ListChecks />
              {t("payments.batchRecord")}
            </Button>
          </>
        }
      />

      {view === "dues" ? (
        <DuesView month={month} onMonthChange={setMonth} reloadKey={reloadKey} />
      ) : (
        <HistoryView reloadKey={reloadKey} onChanged={bump} onEdit={handleEdit} />
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
      <BatchPaymentDialog
        open={batchOpen}
        defaultPeriod={month}
        onClose={() => setBatchOpen(false)}
        onSaved={bump}
      />
    </div>
  );
}
