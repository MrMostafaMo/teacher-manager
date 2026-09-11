import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import {
  buildReportData,
  countReportData,
  type ReportTranslations,
} from "@/features/reports/application/report-cases";
import { exportReportExcel, exportReportPdf } from "@/features/reports/application/export-report";
import type { ReportData, ReportKey } from "@/features/reports/domain";
import { formatDate } from "@/lib/utils/format";
import { useDataChanged } from "@/shared/useDataChanged";
import { toast } from "@/lib/toast-store";

/**
 * Above this total the preview pages server-side (100 rows/page); exports
 * always re-fetch the full set. Smaller reports render in one table.
 */
export const PREVIEW_PAGED_LIMIT = 200;
export const PREVIEW_PAGE_SIZE = 100;

function defaultPeriodArg(key: ReportKey, period: string): string | undefined {
  return ["students", "skills", "weakPoints"].includes(key) ? undefined : period;
}

/** Preview data + pager + export flow for one report key/period. */
export function useReportPreview() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.language?.startsWith("ar") ?? false;
  const [key, setKey] = useState<ReportKey>("students");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);
  const [saved, setSaved] = useState<"excel" | "pdf" | null>(null);
  const [period, setPeriod] = useState(dayjs().format("YYYY-MM"));
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const serverPaged = total !== null && total > PREVIEW_PAGED_LIMIT;

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
    setPage(0);
  }, [key, period]);

  useEffect(() => {
    if (!data) setLoading(true);
    setError(false);
    setSaved(null);
    const periodArg = defaultPeriodArg(key, period);
    // Preview pages server-side; exports re-fetch the full set (see handleExport).
    countReportData(key, periodArg)
      .then((count) => {
        setTotal(count);
        const pageArg =
          count !== null && count > PREVIEW_PAGED_LIMIT
            ? { limit: PREVIEW_PAGE_SIZE, offset: page * PREVIEW_PAGE_SIZE }
            : undefined;
        return buildReportData(key, translations(), periodArg, pageArg);
      })
      .then(setData)
      .catch((e) => {
        console.error("Failed to build report", e);
        toast(t("reports.loadError"), "error");
        setData(null);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [key, period, page, t, translations, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps -- `data` read-only for skeleton gating

  useDataChanged(() => setReloadKey((k) => k + 1));

  async function handleExport(kind: "excel" | "pdf") {
    if (exporting) return;
    setExporting(kind);
    setSaved(null);
    try {
      // Exports always use the full dataset, never the preview page slice.
      const full = await buildReportData(key, translations(), defaultPeriodArg(key, period));
      const ok =
        kind === "excel"
          ? await exportReportExcel(full)
          : await exportReportPdf(full, {
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

  return {
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
  };
}
