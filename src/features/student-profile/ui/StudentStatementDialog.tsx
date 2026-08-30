import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/shared/Modal";
import { CardSkeleton } from "@/shared/Skeletons";
import { toast } from "@/lib/toast-store";
import { formatDate } from "@/lib/utils/format";
import {
  studentStatement,
  type StudentStatement,
} from "@/features/payments/application/payment-cases";
import {
  buildStudentStatementReport,
  type StatementTranslations,
} from "@/features/reports/application/report-cases";
import { exportReportExcel, exportReportPdf } from "@/features/reports/application/export-report";
import { StatementLedger, StatementMonthlyTable } from "./statement-tables";

interface StudentStatementDialogProps {
  open: boolean;
  studentId: string | null;
  studentName: string;
  onClose: () => void;
}

export function StudentStatementDialog({
  open,
  studentId,
  studentName,
  onClose,
}: StudentStatementDialogProps) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.language?.startsWith("ar") ?? false;
  const [data, setData] = useState<StudentStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);

  const load = useCallback(() => {
    if (!studentId) return;
    setLoading(true);
    studentStatement(studentId)
      .then(setData)
      .catch((e) => {
        console.error("Failed to load student statement", e);
        toast(t("profile.statement.loadError"), "error");
      })
      .finally(() => setLoading(false));
  }, [studentId, t]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  function statementTranslations(): StatementTranslations {
    return {
      title: t("profile.statement.title"),
      headers: [
        t("profile.columns.date"),
        t("profile.statement.description"),
        t("profile.columns.amount"),
        t("profile.statement.balance"),
      ],
      monthDues: t("profile.statement.monthDues"),
      total: t("profile.statement.total"),
      method: (m) => t(`payments.${m}`),
    };
  }

  async function handleExport(kind: "excel" | "pdf") {
    if (!data || !studentId || exporting) return;
    setExporting(kind);
    try {
      const report = await buildStudentStatementReport(studentId, statementTranslations());
      const ok =
        kind === "excel"
          ? await exportReportExcel(report)
          : await exportReportPdf(report, {
              rtl,
              subtitle: t("reports.generated", { date: formatDate(Date.now(), "DD-MM-YYYY") }),
            });
      if (ok) {
        toast(t("reports.saved"));
      }
    } catch (e) {
      console.error("Export failed", e);
      toast(t("reports.exportError"), "error");
    } finally {
      setExporting(null);
    }
  }

  const planLabel = data?.planName
    ? `${t("profile.plan")}: ${data.planName}`
    : t("payments.noPlan");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("profile.statement.title")}
      description={`${studentName} · ${planLabel}`}
      className="max-w-2xl"
    >
      {loading ? (
        <CardSkeleton lines={4} />
      ) : data ? (
        <div className="space-y-5">
          <StatementMonthlyTable data={data} />
          <StatementLedger payments={data.payments} />

          <div className="flex items-center justify-end gap-2">
            
            <Button
              variant="outline"
              onClick={() => void handleExport("excel")}
              disabled={exporting !== null}
            >
              <FileSpreadsheet className="size-4" />
              {exporting === "excel" ? t("reports.exporting") : t("reports.exportExcel")}
            </Button>
            <Button onClick={() => void handleExport("pdf")} disabled={exporting !== null}>
              <FileText className="size-4" />
              {exporting === "pdf" ? t("reports.exporting") : t("reports.exportPdf")}
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
