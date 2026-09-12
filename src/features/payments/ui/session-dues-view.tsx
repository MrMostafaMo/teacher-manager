import { toast } from "@/lib/toast-store";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RecordPaymentDialog } from "./RecordPaymentDialog";
import { sessionDues, type SessionDuesRow } from "@/features/payments/application/session-dues-cases";
import { useSessionSettings } from "@/lib/session-settings-store";
import { countByStatus, groupRows } from "./session-dues-helpers";
import { CollapsibleSection } from "@/shared/CollapsibleSection";
import { useCollapsedSections } from "@/shared/useCollapsedSections";
import { PaginatedTable } from "@/shared/PaginatedTable";
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
  const [showAll, setShowAll] = useState(true);
  const [recordRow, setRecordRow] = useState<SessionDuesRow | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    sessionDues({ sessionsPerCycle, warningAt })
      .then(setRows)
      .catch((e) => {
        console.error(e);
        toast(t("payments.loadError"), "error");
      })
      .finally(() => setLoading(false));
  }, [t, sessionsPerCycle, warningAt]);

  useEffect(() => {
    load();
  }, [load, reloadKey, sessionsPerCycle, warningAt]);

  const filtered = useMemo(() => {
    if (showAll) return rows;
    return rows.filter((r) => r.status !== "ok");
  }, [rows, showAll]);

  const { sections, ungrouped } = useMemo(() => groupRows(filtered), [filtered]);

  const cols = useMemo(
    () =>
      sessionColumns(t, (r) => {
        setRecordRow(r);
        setOpen(true);
      }),
    [t],
  );
  const { isCollapsed, toggle } = useCollapsedSections();
  const getSessionRowKey = useCallback((r: SessionDuesRow) => r.student.id, []);

  const S = Number(sessionsPerCycle) || 8;

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
          {sections.map((sec) => {
            const { warn, due } = countByStatus(sec.rows);
            return (
              <CollapsibleSection
                key={sec.id}
                title={`${sec.name} · ${S} ${t("payments.sessions.count")}`}
                meta={`${sec.rows.length} · ${warn} ${t("dashboard.sessions.warning")} / ${due} ${t("dashboard.sessions.due")}`}
                collapsed={isCollapsed(sec.id)}
                onToggle={() => toggle(sec.id)}
              >
                <PaginatedTable columns={cols} rows={sec.rows} getRowKey={getSessionRowKey} pageSize={50} />
              </CollapsibleSection>
            );
          })}
          {ungrouped.length > 0 && (() => {
            const { warn, due } = countByStatus(ungrouped);
            return (
              <CollapsibleSection
                key="__ungrouped"
                title={t("payments.ungrouped")}
                meta={`${ungrouped.length} · ${warn} ${t("dashboard.sessions.warning")} / ${due} ${t("dashboard.sessions.due")}`}
                collapsed={isCollapsed("__ungrouped")}
                onToggle={() => toggle("__ungrouped")}
              >
                <PaginatedTable columns={cols} rows={ungrouped} getRowKey={getSessionRowKey} pageSize={50} />
              </CollapsibleSection>
            );
          })()}
        </div>
      )}
      <RecordPaymentDialog
        open={open}
        defaultPeriod={dayjs().format("YYYY-MM")}
        presetStudentId={recordRow?.student.id}
        presetAmount={recordRow?.plan?.amount ?? undefined}
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
