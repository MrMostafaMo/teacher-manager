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
import { SessionDuesView } from "./session-dues-view";

export default function PaymentsPage() {
  const { t } = useTranslation();
  const [view, setView] = useState<"dues" | "history" | "sessions">("dues");
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
              options={(["dues", "sessions", "history"] as const).map((v) => ({
                value: v,
                label: t(`payments.tab${v === "dues" ? "Dues" : v === "sessions" ? "Sessions" : "History"}`),
              }))}
              ariaLabel={t("payments.viewLabel")}
              className="w-full overflow-x-auto sm:w-auto"
            />
            <Button
              onClick={() => {
                setEditing(null);
                setRecordOpen(true);
              }}
            >
              <Plus />
              <span className="hidden sm:inline">{t("payments.record")}</span>
            </Button>
            <Button variant="outline" onClick={() => setPlansOpen(true)}>
              <CreditCard />
              <span className="hidden sm:inline">{t("payments.managePlans")}</span>
            </Button>
            <Button variant="outline" onClick={() => setBatchOpen(true)}>
              <ListChecks />
              <span className="hidden sm:inline">{t("payments.batchRecord")}</span>
            </Button>
          </>
        }
      />

      {view === "dues" ? (
        <DuesView month={month} onMonthChange={setMonth} reloadKey={reloadKey} />
      ) : view === "sessions" ? (
        <SessionDuesView reloadKey={reloadKey} />
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
