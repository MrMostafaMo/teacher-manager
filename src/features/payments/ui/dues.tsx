import { memo, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { PiggyBank, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { monthlyDues, type DuesRow } from "@/features/payments/application/payment-cases";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/utils/format";
import { CollapsibleSection } from "@/shared/CollapsibleSection";
import { useCollapsedSections } from "@/shared/useCollapsedSections";
import { MonthPicker } from "@/shared/DatePicker";
import { TableRowsSkeleton } from "@/shared/Skeletons";
import { EmptyState } from "@/shared/EmptyState";
import { DuesTable } from "./dues-table";

export const inputClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring";

export function subtotal(list: DuesRow[]): number {
  return list.reduce((acc, r) => acc + Math.max(r.remaining, 0), 0);
}

export const DuesView = memo(function DuesView({
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
  const { isCollapsed, toggle } = useCollapsedSections();

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

  const totals = useMemo(() => subtotal(rows), [rows]);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {t("payments.month")}
          <MonthPicker
            value={month}
            onChange={(v) => onMonthChange(v || dayjs().format("YYYY-MM"))}
            ariaLabel={t("payments.month")}
            className={cn(inputClass)}
          />
        </div>
        <Badge variant="secondary">
          <Wallet className="size-3.5" />
          {t("payments.remaining")}: {formatMoney(totals)}
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
            const collapsed = isCollapsed(sec.id);
            return (
              <CollapsibleSection
                key={sec.id}
                title={sec.name}
                meta={`${sec.rows.length} · ${formatMoney(subtotal(sec.rows))}`}
                collapsed={collapsed}
                onToggle={() => toggle(sec.id)}
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
              collapsed={isCollapsed("__ungrouped")}
              onToggle={() => toggle("__ungrouped")}
            >
              <DuesTable list={ungrouped} />
            </CollapsibleSection>
          )}
        </div>
      )}
    </div>
  );
});
