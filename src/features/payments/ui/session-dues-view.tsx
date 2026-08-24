import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RecordPaymentDialog } from "./RecordPaymentDialog";
import { sessionDues, type SessionDuesRow } from "@/features/payments/application/session-dues-cases";
import { useSessionSettings } from "@/lib/session-settings-store";
import { compareGroupsByName } from "@/lib/utils/group-sort";
import { statusForCount } from "@/features/payments/application/session-dues";
import { groupRepository } from "@/features/groups/infrastructure/group-repo";
import { CollapsibleSection } from "@/shared/CollapsibleSection";
import { useCollapsedSections } from "@/shared/useCollapsedSections";
import { DataTable } from "@/shared/DataTable";
import { EmptyState } from "@/shared/EmptyState";
import { TableRowsSkeleton } from "@/shared/Skeletons";
import { sessionColumns } from "./session-columns";
import dayjs from "dayjs";

export const SessionDuesView = memo(function SessionDuesView({ reloadKey }: { reloadKey: number }) {
  const { t } = useTranslation();
  const sessionsPerCycle = useSessionSettings((s) => s.sessionsPerCycle);
  const warningAt = useSessionSettings((s) => s.warningAt);
  const [rows, setRows] = useState<SessionDuesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [recordRow, setRecordRow] = useState<SessionDuesRow | null>(null);
  const [open, setOpen] = useState(false);
  const [groupSettings, setGroupSettings] = useState<Map<string, { sessionsPerCycle: number | null; warningAt: number | null }>>(new Map());

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([sessionDues(), groupRepository.list()])
      .then(([r, groups]) => {
        setRows(r);
        const m = new Map<string, { sessionsPerCycle: number | null; warningAt: number | null }>();
        for (const g of groups) m.set(g.id, { sessionsPerCycle: (g as unknown as { sessionsPerCycle: number | null }).sessionsPerCycle ?? null, warningAt: (g as unknown as { warningAt: number | null }).warningAt ?? null });
        setGroupSettings(m);
      })
      .catch((e) => {
        console.error(e);
        setError(t("payments.loadError"));
      })
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    load();
  }, [load, reloadKey, sessionsPerCycle, warningAt]);

  const filtered = useMemo(() => {
    if (showAll) return rows;
    return rows.filter((r) => r.status !== "ok");
  }, [rows, showAll]);

  const { sections, ungrouped } = useMemo(() => {
    const byGroup = new Map<string, { id: string; name: string; rows: SessionDuesRow[] }>();
    const ungroupedRows: SessionDuesRow[] = [];
    for (const r of filtered) {
      if (r.groups.length === 0) ungroupedRows.push(r);
      else for (const g of r.groups) {
        let sec = byGroup.get(g.id);
        if (!sec) { sec = { id: g.id, name: g.name, rows: [] }; byGroup.set(g.id, sec); }
        sec.rows.push(r);
      }
    }
    return { sections: [...byGroup.values()].sort((a,b)=> compareGroupsByName(a,b)), ungrouped: ungroupedRows };
  }, [filtered]);

  const cols = useMemo(
    () =>
      sessionColumns(t, (r) => {
        setRecordRow(r);
        setOpen(true);
      }),
    [t],
  );
  const { isCollapsed, toggle } = useCollapsedSections();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowAll((v) => !v)}>
          {showAll ? t("payments.sessions.showDueOnly") : t("payments.sessions.showAll")}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading ? (
        <TableRowsSkeleton rows={5} cols={6} />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={PiggyBank}
              title={showAll ? t("payments.emptySessionsAll") : t("payments.emptySessions")}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sections.map((sec) => {
            const cfg = groupSettings.get(sec.id);
            const rawS = cfg?.sessionsPerCycle;
            const rawW = cfg?.warningAt;
            const S = rawS != null && Number.isFinite(Number(rawS)) ? Number(rawS) : Number(sessionsPerCycle) || 8;
            const Wraw = rawW != null && Number.isFinite(Number(rawW)) ? Number(rawW) : (rawS != null && Number.isFinite(Number(rawS)) ? Number(rawS) - 2 : Number(warningAt) || 6);
            const W = Number.isFinite(Wraw) ? Wraw : S - 2;
            const effRows = sec.rows.map((r) => {
              const count = Number(r.count) || 0;
              const Snum = Number(S) || 8;
              const st = statusForCount(count, Snum, Number(W) || Snum - 2);
              const remaining = Math.max(0, Snum - count);
              const price = r.pricePerSession != null && Number.isFinite(Snum) && Snum > 0 ? Math.round((r.fullCycleAmount ?? 0) / Snum) : r.pricePerSession;
              return { ...r, count, status: st, remainingSessions: remaining, pricePerSession: price, remainingAmount: price != null ? remaining * price : null } as SessionDuesRow;
            });
            const warn = effRows.filter((r) => r.status === "warning").length;
            const due = effRows.filter((r) => r.status === "due").length;
            return (
              <CollapsibleSection
                key={sec.id}
                title={`${sec.name} · ${S} ${t("payments.sessions.count")}`}
                meta={`${effRows.length} · ${warn} ${t("dashboard.sessions.warning")} / ${due} ${t("dashboard.sessions.due")}`}
                collapsed={isCollapsed(sec.id)}
                onToggle={() => toggle(sec.id)}
              >
                <DataTable columns={cols} rows={effRows} getRowKey={(r) => r.student.id} />
              </CollapsibleSection>
            );
          })}
          {ungrouped.length > 0 && (
            <CollapsibleSection
              key="__ungrouped"
              title={t("payments.ungrouped")}
              meta={`${ungrouped.length} · ${ungrouped.filter((r)=>r.status==="warning").length} ${t("dashboard.sessions.warning")} / ${ungrouped.filter((r)=>r.status==="due").length} ${t("dashboard.sessions.due")}`}
              collapsed={isCollapsed("__ungrouped")}
              onToggle={() => toggle("__ungrouped")}
            >
              <DataTable columns={cols} rows={ungrouped} getRowKey={(r) => r.student.id} />
            </CollapsibleSection>
          )}
        </div>
      )}
      <RecordPaymentDialog
        open={open}
        defaultPeriod={dayjs().format("YYYY-MM")}
        presetStudentId={recordRow?.student.id}
        presetAmount={recordRow?.remainingAmount ?? recordRow?.fullCycleAmount ?? undefined}
        onClose={() => {
          setOpen(false);
          setRecordRow(null);
        }}
        onSaved={() => {
          setOpen(false);
          setRecordRow(null);
          load();
          window.dispatchEvent(new CustomEvent("tm:data-changed"));
        }}
      />
    </div>
  );
});
