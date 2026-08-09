import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/shared/DataTable";
import { Modal } from "@/shared/Modal";
import { CardSkeleton } from "@/shared/Skeletons";
import { toast } from "@/lib/toast-store";
import { formatDate, formatMoney } from "@/lib/utils/format";
import {
  studentStatement,
  type StudentStatement,
} from "@/features/payments/application/payment-cases";
import {
  buildStudentStatementReport,
  type StatementTranslations,
} from "@/features/reports/application/report-cases";
import { exportReportExcel, exportReportPdf } from "@/features/reports/application/export-report";

interface StudentStatementDialogProps {
  open: boolean;
  studentId: string | null;
  studentName: string;
  onClose: () => void;
}

function displayPeriod(period: string): string {
  return period.split("-").reverse().join("-");
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
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);

  const load = useCallback(() => {
    if (!studentId) return;
    setLoading(true);
    setError("");
    studentStatement(studentId)
      .then(setData)
      .catch((e) => {
        console.error("Failed to load student statement", e);
        setError(t("profile.statement.loadError"));
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
    setError("");
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
      setError(t("reports.exportError"));
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
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : data ? (
        <div className="space-y-5">
          <div>
            <h3 className="mb-2 text-sm font-semibold">
              {t("profile.statement.monthly")}
            </h3>
            <DataTable
              columns={[
                {
                  header: t("profile.statement.month"),
                  render: (m) => displayPeriod(m.period),
                },
                {
                  header: t("payments.due"),
                  render: (m) => formatMoney(m.due),
                  className: "text-end",
                },
                {
                  header: t("payments.paid"),
                  render: (m) => formatMoney(m.paid),
                  className: "text-end",
                },
                {
                  header: t("profile.statement.balance"),
                  render: (m) => formatMoney(m.balance),
                  className: "text-end",
                },
                {
                  header: t("profile.statement.running"),
                  render: (m) => formatMoney(m.running),
                  className: "text-end",
                },
              ]}
              rows={data.months}
              getRowKey={(m) => m.period}
              className="max-h-64 overflow-y-auto rounded-lg border"
            />
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                {t("profile.statement.totalDue")}: {formatMoney(data.totalDue)}
              </span>
              <span>
                {t("profile.statement.totalPaid")}: {formatMoney(data.totalPaid)}
              </span>
              <span>
                {t("profile.statement.totalBalance")}: {formatMoney(data.totalBalance)}
              </span>
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">
              {t("profile.statement.ledger")}
            </h3>
            {data.payments.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t("profile.statement.empty")}
              </p>
            ) : (
              <DataTable
                columns={[
                  {
                    header: t("profile.columns.date"),
                    render: (p) => formatDate(p.payment.paidAt, "DD-MM-YYYY"),
                  },
                  {
                    header: t("profile.columns.period"),
                    render: (p) => (p.payment.period ? displayPeriod(p.payment.period) : "—"),
                  },
                  {
                    header: t("profile.columns.method"),
                    render: (p) => t(`payments.${p.payment.method}`),
                  },
                  {
                    header: t("profile.columns.amount"),
                    render: (p) => formatMoney(p.payment.amount),
                    className: "text-end",
                  },
                  {
                    header: t("profile.statement.running"),
                    render: (p) => formatMoney(p.cumulativePaid),
                    className: "text-end",
                  },
                  {
                    header: t("payments.note"),
                    render: (p) => p.payment.note ?? "—",
                  },
                ]}
                rows={data.payments}
                getRowKey={(p) => p.payment.id}
                className="max-h-64 overflow-y-auto rounded-lg border"
              />
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            {error && <span className="text-sm text-destructive">{error}</span>}
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
