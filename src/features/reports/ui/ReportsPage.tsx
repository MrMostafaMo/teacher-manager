import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TableRowsSkeleton } from "@/shared/Skeletons";
import { PageHeader } from "@/shared/PageHeader";
import { EmptyState } from "@/shared/EmptyState";
import { DataTable } from "@/shared/DataTable";
import { PaginatedTable } from "@/shared/PaginatedTable";
import { MonthPicker } from "@/shared/month-picker";
import { Segmented } from "@/shared/Segmented";
import type { ReportKey } from "@/features/reports/domain";
import { ReportExportActions, useReportColumns } from "./report-actions";
import { PREVIEW_PAGE_SIZE, useReportPreview } from "./use-report-preview";

const REPORT_KEYS: ReportKey[] = [
  "students",
  "attendance",
  "exams",
  "payments",
  "expenses",
  "finances",
  "skills",
  "weakPoints",
  "homework",
  "sessionAttendance",
];

export default function ReportsPage() {
  const { t } = useTranslation();
  const {
    key,
    setKey,
    data,
    loading,
    exporting,
    saved,
    period,
    setPeriod,
    setReloadKey,
    error,
    page,
    setPage,
    total,
    serverPaged,
    handleExport,
  } = useReportPreview();

  const columns = useReportColumns(data, key);
  // Content-stable keys (index suffix only disambiguates duplicate rows).
  const getRowKey = useCallback((row: (string | number)[], i: number) => `${row.join("|")}:${i}`, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.reports")}
        description={t("reports.subtitle")}
        actions={
          <ReportExportActions
            data={data}
            exporting={exporting}
            onExport={(kind) => void handleExport(kind)}
          />
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Segmented
          value={key}
          onChange={(v) => setKey(v as ReportKey)}
          ariaLabel={t("nav.reports")}
          options={REPORT_KEYS.map((k) => ({ value: k, label: t(`reports.types.${k}.label`) }))}
          className="overflow-x-auto"
        />
        {!["students", "skills", "weakPoints"].includes(key) && (
          <MonthPicker value={period} onChange={setPeriod} />
        )}
      </div>

      {saved && (
        <p role="status" aria-live="polite" className="text-sm text-success">
          {t("reports.saved")}
        </p>
      )}

      <Card>
        <CardContent className="p-0">
          {loading && !data ? (
            <TableRowsSkeleton rows={6} cols={5} />
          ) : error ? (
            <EmptyState
              icon={AlertTriangle}
              title={t("reports.loadError")}
              action={
                <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
                  {t("common.retry")}
                </Button>
              }
            />
          ) : !data || data.rows.length === 0 ? (
            <EmptyState icon={BarChart3} title={t("reports.empty")} />
          ) : serverPaged && total !== null ? (
            <PaginatedTable
              columns={columns}
              rows={data.rows}
              getRowKey={getRowKey}
              page={page}
              total={total}
              pageSize={PREVIEW_PAGE_SIZE}
              onPageChange={setPage}
            />
          ) : (
            <DataTable columns={columns} rows={data.rows} getRowKey={getRowKey} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
