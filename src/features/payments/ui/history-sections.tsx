import { useTranslation } from "react-i18next";
import type { Payment } from "@/lib/db/schema";
import { formatMoney } from "@/lib/utils/format";
import { CollapsibleSection } from "@/shared/CollapsibleSection";
import { HistoryTable } from "./history-table";
import { sectionTotal, type HistorySection } from "./history-grouping";
import type { PaymentHistoryRow } from "@/features/payments/application/payment-cases";

export function HistorySections({
  sections,
  ungrouped,
  collapsed,
  onToggle,
  deletingId,
  receiptBusyId,
  onEdit,
  onDelete,
  onReceipt,
}: {
  sections: HistorySection[];
  ungrouped: PaymentHistoryRow[];
  collapsed: Record<string, boolean>;
  onToggle: (id: string) => void;
  deletingId: string | null;
  receiptBusyId: string | null;
  onEdit: (payment: Payment) => void;
  onDelete: (id: string) => void;
  onReceipt: (row: PaymentHistoryRow) => void;
}) {
  const { t } = useTranslation();

  function renderTable(list: PaymentHistoryRow[]) {
    return (
      <HistoryTable
        list={list}
        deletingId={deletingId}
        receiptBusyId={receiptBusyId}
        onEdit={onEdit}
        onDelete={onDelete}
        onReceipt={onReceipt}
      />
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((sec) => {
        const isCollapsed = !!collapsed[sec.id];
        return (
          <CollapsibleSection
            key={sec.id}
            title={sec.name}
            meta={`${sec.list.length} · ${formatMoney(sectionTotal(sec.list))}`}
            collapsed={isCollapsed}
            onToggle={() => onToggle(sec.id)}
          >
            {renderTable(sec.list)}
          </CollapsibleSection>
        );
      })}
      {ungrouped.length > 0 && (
        <CollapsibleSection
          key="__ungrouped"
          title={t("payments.ungrouped")}
          meta={`${ungrouped.length} · ${formatMoney(sectionTotal(ungrouped))}`}
          collapsed={!!collapsed.__ungrouped}
          onToggle={() => onToggle("__ungrouped")}
        >
          {renderTable(ungrouped)}
        </CollapsibleSection>
      )}
    </div>
  );
}
