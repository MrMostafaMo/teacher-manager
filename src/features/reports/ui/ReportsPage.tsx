import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TableRowsSkeleton } from "@/shared/Skeletons";
import { PageHeader } from "@/shared/PageHeader";
import { EmptyState } from "@/shared/EmptyState";
import { DataTable } from "@/shared/DataTable";
import { MonthPicker } from "@/shared/month-picker";
import { Segmented } from "@/shared/Segmented";
import dayjs from "dayjs";
import {
  buildReportData,
  type ReportTranslations,
} from "@/features/reports/application/report-cases";
import { exportReportExcel, exportReportPdf } from "@/features/reports/application/export-report";
import type { ReportData, ReportKey } from "@/features/reports/domain";
import { formatDate } from "@/lib/utils/format";
import { ReportExportActions, useReportColumns } from "./report-actions";
import { toast } from "@/lib/toast-store";

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
  const { t, i18n } = useTranslation();
  const rtl = i18n.language?.startsWith("ar") ?? false;
  const [key, setKey] = useState<ReportKey>("students");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);
  const [saved, setSaved] = useState<"excel" | "pdf" | null>(null);

  const [period, setPeriod] = useState(dayjs().format("YYYY-MM"));

  const translations = useCallback(
    (): ReportTranslations => ({
      title: t(`reports.types.${key}.title`),
      headers:
        (t(`reports.types.${key}.headers`, { returnObjects: true }) as unknown as string[]) ?? [],
      status: (s) => (s === "active" ? t("students.statusActive") : t("students.statusInactive")),
      category: (c) => t(`expenses.categories.${c}`),
      weakStatus: (s) => t(`weakPoints.${s}`),
    }),
    [t, key],
  );

  useEffect(() => {
    setLoading(true);
    const periodArg = ["students", "skills", "weakPoints"].includes(key) ? undefined : period;
    buildReportData(key, translations(), periodArg)
      .then(setData)
      .catch((e) => {
        console.error("Failed to build report", e);
        toast(t("reports.loadError"), "error");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [key, period, t, translations]);

  async function handleExport(kind: "excel" | "pdf") {
    if (!data || exporting) return;
    setExporting(kind);
    setSaved(null);
    try {
      const ok =
        kind === "excel"
          ? await exportReportExcel(data)
          : await exportReportPdf(data, {
              rtl,
              subtitle: t("reports.generated", { date: formatDate(Date.now(), "DD-MM-YYYY") }),
            });
      if (ok) setSaved(kind);
    } catch (e) {
      console.error("Export failed", e);
      toast(t("reports.exportError"), "error");
    } finally {
      setExporting(null);
    }
  }

  const columns = useReportColumns(data, key);
  const getRowKey = useCallback((_: (string | number)[], i: number) => String(i), []);

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

      
      {saved && <p className="text-sm text-success">{t("reports.saved")}</p>}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <TableRowsSkeleton rows={6} cols={5} />
          ) : !data || data.rows.length === 0 ? (
            <EmptyState icon={BarChart3} title={t("reports.empty")} />
          ) : (
            <DataTable columns={columns} rows={data.rows} getRowKey={getRowKey} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
