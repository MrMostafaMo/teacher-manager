import { toast } from "@/lib/toast-store";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RecordPaymentDialog } from "./RecordPaymentDialog";
import { sessionDues, type SessionDuesRow } from "@/features/payments/application/session-dues-cases";
import { useSessionSettings } from "@/lib/session-settings-store";
import { groupRepository } from "@/features/groups/infrastructure/group-repo";
import { enrichSections, enrichUngrouped, groupRows } from "./session-dues-helpers";
import { CollapsibleSection } from "@/shared/CollapsibleSection";
import { useCollapsedSections } from "@/shared/useCollapsedSections";
import { DataTable } from "@/shared/DataTable";
import { EmptyState } from "@/shared/EmptyState";
import { TableRowsSkeleton } from "@/shared/Skeletons";
import { sessionColumns } from "./session-columns";
import { useSessionAdjust } from "./use-session-adjust";
import dayjs from "dayjs";

export const SessionDuesView = memo(function SessionDuesView({ reloadKey }: { reloadKey: number }) {
  const { t } = useTranslation();
  const sessionsPerCycle = useSessionSettings((s) => s.sessionsPerCycle);
  const warningAt = useSessionSettings((s) => s.warningAt);
  const [rows, setRows] = useState<SessionDuesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(true);
  const [recordRow, setRecordRow] = useState<SessionDuesRow | null>(null);
  const [open, setOpen] = useState(false);
  const [groupSettings, setGroupSettings] = useState<Map<string, { sessionsPerCycle: number | null; warningAt: number | null }>>(new Map());

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([sessionDues(), groupRepository.list()])
      .then(([r, groups]) => {
        setRows(r);
        const m = new Map<string, { sessionsPerCycle: number | null; warningAt: number | null }>();
        for (const g of groups) m.set(g.id, { sessionsPerCycle: (g as unknown as { sessionsPerCycle: number | null }).sessionsPerCycle ?? null, warningAt: (g as unknown as { warningAt: number | null }).warningAt ?? null });
        setGroupSettings(m);
      })
      .catch((e) => {
        console.error(e);
        toast(t("payments.loadError"), "error");
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

  const { sections, ungrouped } = useMemo(() => groupRows(filtered), [filtered]);

  const adjust = useSessionAdjust(load);
  const cols = useMemo(
    () =>
      sessionColumns(
        t,
        (r) => {
          setRecordRow(r);
          setOpen(true);
        },
        (r) => adjust.add(r.student.id),
        (r) => adjust.remove(r.student.id),
        adjust.busyId,
      ),
    [t, adjust],
  );
  const { isCollapsed, toggle } = useCollapsedSections();
  const getSessionRowKey = useCallback((r: SessionDuesRow) => r.student.id, []);

  const sectionsWithEff = useMemo(
    () => enrichSections(sections, groupSettings, sessionsPerCycle, warningAt),
    [sections, groupSettings, sessionsPerCycle, warningAt],
  );
  const ungroupedEff = useMemo(
    () => enrichUngrouped(ungrouped, sessionsPerCycle, warningAt),
    [ungrouped, sessionsPerCycle, warningAt],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowAll((v) => !v)}>
          {showAll ? t("payments.sessions.showDueOnly") : t("payments.sessions.showAll")}
        </Button>
      </div>
      
      {loading && rows.length === 0 ? (
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
          {sectionsWithEff.map(({ sec, effRows, warn, due, S }) => (
            <CollapsibleSection
              key={sec.id}
              title={`${sec.name} · ${S} ${t("payments.sessions.count")}`}
              meta={`${effRows.length} · ${warn} ${t("dashboard.sessions.warning")} / ${due} ${t("dashboard.sessions.due")}`}
              collapsed={isCollapsed(sec.id)}
              onToggle={() => toggle(sec.id)}
            >
              <DataTable columns={cols} rows={effRows} getRowKey={getSessionRowKey} />
            </CollapsibleSection>
          ))}
          {ungroupedEff.rows.length > 0 && (
            <CollapsibleSection
              key="__ungrouped"
              title={t("payments.ungrouped")}
              meta={`${ungroupedEff.rows.length} · ${ungroupedEff.warn} ${t("dashboard.sessions.warning")} / ${ungroupedEff.due} ${t("dashboard.sessions.due")}`}
              collapsed={isCollapsed("__ungrouped")}
              onToggle={() => toggle("__ungrouped")}
            >
              <DataTable columns={cols} rows={ungroupedEff.rows} getRowKey={getSessionRowKey} />
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
          // ponytail: local only — global dispatch would remount PaymentsPage and reset view to "dues"
        }}
      />
    </div>
  );
});
