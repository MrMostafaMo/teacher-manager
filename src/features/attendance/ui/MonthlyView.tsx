import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { Card, CardContent } from "@/components/ui/card";
import { getMonthly, type StudentMonthlyRow } from "@/features/attendance/application/attendance-cases";
import { CollapsibleSection } from "@/shared/CollapsibleSection";
import { TableRowsSkeleton } from "@/shared/Skeletons";
import { MonthPicker } from "@/shared/DatePicker";
import { useMemberships, buildSections } from "./attendance-sections";
import { SummaryCards } from "./SummaryCards";
import { MonthlySummaryTable } from "./MonthlySummaryTable";
import { EmptyStudents } from "./EmptyStudents";

const inputClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring dark:bg-muted/50";

export function MonthlyView({ month, onMonthChange }: { month: string; onMonthChange: (m: string) => void }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<StudentMonthlyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const groupsByStudent = useMemberships();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoading(true);
    setError("");
    getMonthly(month)
      .then(setRows)
      .catch((e) => {
        console.error("Failed to load monthly stats", e);
        setError(t("attendance.errors.load"));
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [month]);

  const totals = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;
    for (const r of rows) {
      present += r.present;
      absent += r.absent;
      late += r.late;
      excused += r.excused;
    }
    const total = present + absent + late + excused;
    return {
      counts: { present, absent, late, excused },
      total,
      rate: total > 0 ? (present + late + excused) / total : null,
    };
  }, [rows]);

  const { sections, ungrouped } = useMemo(
    () => buildSections(rows, groupsByStudent, (r) => r.studentId),
    [rows, groupsByStudent],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {t("attendance.month")}
          <MonthPicker
            value={month}
            onChange={(v) => onMonthChange(v || dayjs().format("YYYY-MM"))}
            ariaLabel={t("attendance.month")}
            className={inputClass}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && rows.length > 0 && (
        <SummaryCards
          total={totals.total}
          totalLabel="attendance.summary.totalMonth"
          counts={totals.counts}
          rate={totals.rate}
        />
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <TableRowsSkeleton rows={5} cols={3} />
          ) : rows.length === 0 ? (
            <EmptyStudents />
          ) : (
            <div className="space-y-4 p-4">
              {sections.map((sec) => {
                const isCollapsed = !!collapsed[`summary-${sec.id}`];
                return (
                  <CollapsibleSection
                    key={`summary-${sec.id}`}
                    title={sec.name}
                    meta={`${sec.list.length}`}
                    collapsed={isCollapsed}
                    onToggle={() =>
                      setCollapsed((c) => ({ ...c, [`summary-${sec.id}`]: !isCollapsed }))
                    }
                  >
                    <MonthlySummaryTable list={sec.list} groupLabel={sec.name} />
                  </CollapsibleSection>
                );
              })}
              {ungrouped.length > 0 && (
                <CollapsibleSection
                  key="summary-__ungrouped"
                  title={t("students.ungrouped")}
                  meta={`${ungrouped.length}`}
                  collapsed={!!collapsed["summary-__ungrouped"]}
                  onToggle={() =>
                    setCollapsed((c) => ({
                      ...c,
                      "summary-__ungrouped": !collapsed["summary-__ungrouped"],
                    }))
                  }
                >
                  <MonthlySummaryTable list={ungrouped} groupLabel={t("students.ungrouped")} />
                </CollapsibleSection>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
