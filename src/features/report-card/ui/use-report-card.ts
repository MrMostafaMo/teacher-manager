import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import type { StudentProfileData } from "@/features/student-profile/application/student-profile-cases";
import { buildReportCardData } from "@/features/report-card/application/report-card-data";
import { exportReportCardPdf } from "@/features/report-card/application/report-card-export";
import { buildReportCardPdfData } from "@/features/report-card/application/report-card-pdf-data";
import { toast } from "@/lib/toast-store";

/** Drives the report-card export from the profile header; toasts success/error. */
export function useReportCard(data: StudentProfileData | null) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const run = useCallback(async () => {
    if (!data) return;
    setBusy(true);
    try {
      const pdf = buildReportCardPdfData(buildReportCardData(data), {
        title: t("reportCard.title"),
        footer: t("reportCard.footer"),
        group: t("reportCard.group"),
        enrolled: t("reportCard.enrolled"),
        attendance: t("reportCard.attendance"),
        homework: t("reportCard.homework"),
        exams: t("reportCard.exams"),
        weakSkills: t("reportCard.weakSkills"),
        notes: t("reportCard.notes"),
        none: t("reportCard.none"),
        present: t("attendance.statusPresent"),
        absent: t("attendance.statusAbsent"),
        late: t("attendance.statusLate"),
        excused: t("attendance.statusExcused"),
        rate: t("reportCard.rate"),
      }, document.documentElement.dir === "rtl");
      await exportReportCardPdf(pdf);
      toast(t("reportCard.saved"));
    } catch (e) {
      console.error("Failed to export report card", e);
      toast(t("reportCard.error"), "error");
    } finally {
      setBusy(false);
    }
  }, [data, t]);

  return { busy, run };
}
