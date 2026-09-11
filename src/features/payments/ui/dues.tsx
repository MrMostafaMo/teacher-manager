import { memo, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { PiggyBank, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { monthlyDues, type DuesRow } from "@/features/payments/application/payment-cases";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/utils/format";
import { compareGroupsByName } from "@/lib/utils/group-sort";
import { CollapsibleSection } from "@/shared/CollapsibleSection";
import { useCollapsedSections } from "@/shared/useCollapsedSections";
import { MonthPicker } from "@/shared/month-picker";
import { SELECT_CLASS } from "@/shared/picker-shared";
import { TableRowsSkeleton } from "@/shared/Skeletons";
import { EmptyState } from "@/shared/EmptyState";
import { DuesTable } from "./dues-table";
import { toast } from "@/lib/toast-store";

export const inputClass = SELECT_CLASS;

/** Above this many billed students sections give way to a flat paged table. */
const GROUPED_LIMIT = 300;
const PAGE_SIZE = 50;

export function subtotal(list: DuesRow[]): number {
  return list.reduce((acc, r) => acc + Math.max(r.remaining, 0), 0);
}

export interface DuesSummary {
  count: number;
  due: number;
  paid: number;
  remaining: number;
}

/** Global month totals over already-fetched rows (badge source when paging). */
export function summarizeDues(rows: DuesRow[]): DuesSummary {
  return {
    count: rows.length,
    due: rows.reduce((a, r) => a + r.due, 0),
    paid: rows.reduce((a, r) => a + r.paid, 0),
    remaining: subtotal(rows),
  };
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
  const [allRows, setAllRows] = useState<DuesRow[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const { isCollapsed, toggle } = useCollapsedSections();
  // Single fetch: the badge totals derive from the same rows the table shows.
  const totals = useMemo(() => summarizeDues(allRows), [allRows]);
  const flat = totals.count > GROUPED_LIMIT;
  const rows = flat ? allRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : allRows;

  useEffect(() => {
    setPage(0);
  }, [month, reloadKey]);

  useEffect(() => {
    setLoading(true);
    monthlyDues(month)
      .then(setAllRows)
      .catch((e) => {
        console.error("Failed to load monthly dues", e);
        toast(t("payments.loadError"), "error");
        setAllRows([]);
      })
      .finally(() => setLoading(false));
  }, [month, reloadKey, t]);

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
    const sorted = [...byGroup.values()].sort((a, b) => compareGroupsByName(a, b));
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
          {t("payments.remaining")}: {formatMoney(totals.remaining)}
        </Badge>
      </div>

      {loading && rows.length === 0 ? (
        <TableRowsSkeleton rows={5} cols={5} />
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState icon={PiggyBank} title={t("payments.emptyDues")} />
          </CardContent>
        </Card>
      ) : flat ? (
        <Card>
          <CardContent className="p-0">
            <DuesTable
              list={rows}
              pager={{ page, total: totals.count, pageSize: PAGE_SIZE, onPageChange: setPage }}
            />
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
