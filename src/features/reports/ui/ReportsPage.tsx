import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TableRowsSkeleton } from "@/shared/Skeletons";
import { PageHeader } from "@/shared/PageHeader";
import { EmptyState } from "@/shared/EmptyState";
import { buildReportData, type ReportTranslations } from "@/features/reports/application/report-cases";
import { exportReportExcel, exportReportPdf } from "@/features/reports/application/export-report";
import type { ReportData, ReportKey } from "@/features/reports/domain";
import { formatDate, formatMoney } from "@/lib/utils/format";

const REPORT_KEYS: ReportKey[] = [
  "students",
  "attendance",
  "exams",
  "payments",
  "expenses",
  "finances",
  "skills",
];

/** Column indexes that hold EGP amounts per report key (0-based). */
const MONEY_COLUMNS: Partial<Record<ReportKey, number[]>> = {
  payments: [1, 2, 3],
  expenses: [3],
  finances: [1, 2, 3],
};

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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.reports")}
        description={t("reports.subtitle")}
        actions={
          <>
            <Button variant="outline" onClick={() => void handleExport("excel")} disabled={!data || exporting !== null}>
              <FileSpreadsheet />
              {exporting === "excel" ? t("reports.exporting") : t("reports.exportExcel")}
            </Button>
            <Button onClick={() => void handleExport("pdf")} disabled={!data || exporting !== null}>
              <FileText />
              {exporting === "pdf" ? t("reports.exporting") : t("reports.exportPdf")}
            </Button>
          </>
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    {data.headers.map((h, i) => (
                      <th key={i} className="px-4 py-2.5 text-start font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                      {row.map((cell, j) => (
                        <td key={j} className="px-4 py-2.5 whitespace-nowrap">
                          {typeof cell === "number" && MONEY_COLUMNS[key]?.includes(j)
                            ? formatMoney(cell)
                            : String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
