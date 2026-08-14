import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TableRowsSkeleton } from "@/shared/Skeletons";
import { PageHeader } from "@/shared/PageHeader";
import { EmptyState } from "@/shared/EmptyState";
import { DataTable } from "@/shared/DataTable";
import { buildReportData, type ReportTranslations } from "@/features/reports/application/report-cases";
import { exportReportExcel, exportReportPdf } from "@/features/reports/application/export-report";
import type { ReportData, ReportKey } from "@/features/reports/domain";
import { formatDate } from "@/lib/utils/format";
import { ReportExportActions, useReportColumns } from "./report-actions";

const REPORT_KEYS: ReportKey[] = [
  "students",
  "attendance",
  "exams",
  "payments",
  "expenses",
  "finances",
  "skills",
  "weakPoints",
];

export default function ReportsPage() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.language?.startsWith("ar") ?? false;
  const [key, setKey] = useState<ReportKey>("students");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);
  const [saved, setSaved] = useState<"excel" | "pdf" | null>(null);

  const translations = useCallback(
    (): ReportTranslations => ({
      title: t(`reports.types.${key}.title`),
      headers: (t(`reports.types.${key}.headers`, { returnObjects: true }) as unknown as string[]) ?? [],
      status: (s) => (s === "active" ? t("students.statusActive") : t("students.statusInactive")),
      category: (c) => t(`expenses.categories.${c}`),
      weakStatus: (s) => t(`weakPoints.${s}`),
    }),
    [t, key],
  );

  useEffect(() => {
    setLoading(true);
    setError("");
    buildReportData(key, translations())
      .then(setData)
      .catch((e) => {
        console.error("Failed to build report", e);
        setError(t("reports.loadError"));
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [key, t, translations]);

  async function handleExport(kind: "excel" | "pdf") {
    if (!data || exporting) return;
    setExporting(kind);
    setError("");
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
      setError(t("reports.exportError"));
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

      <div className="flex flex-wrap gap-2">
        {REPORT_KEYS.map((k) => (
          <Button
            key={k}
            variant={k === key ? "default" : "outline"}
            size="sm"
            onClick={() => setKey(k)}
          >
            {t(`reports.types.${k}.label`)}
          </Button>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-success">{t("reports.saved")}</p>}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <TableRowsSkeleton rows={6} cols={5} />
          ) : !data || data.rows.length === 0 ? (
            <EmptyState icon={BarChart3} title={t("reports.empty")} />
          ) : (
            <DataTable
              columns={columns}
              rows={data.rows}
              getRowKey={getRowKey}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
