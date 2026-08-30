import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useTeacherProfile } from "@/features/teacher-profile/application/use-teacher-profile";
import type { StudentProfileData } from "../application/student-profile-cases";
import { exportIdCardPdf } from "../application/id-card-export";
import type { IdCardPdfData } from "../application/id-card-pdf-data";
import { toast } from "@/lib/toast-store";
import { formatDate } from "@/lib/utils/format";

export function useIdCard() {
  const { t, i18n } = useTranslation();
  const { name: teacherName } = useTeacherProfile();

  const handleExportIdCard = useCallback(
    async (profile: StudentProfileData) => {
      try {
        const centerName = teacherName || t("app.name");
        const rtl = i18n.dir() === "rtl";

        let enrolledDate = null;
        if (profile.student.enrolledOn) {
          const val = profile.student.enrolledOn;
          enrolledDate = formatDate(typeof val === "string" ? parseInt(val, 10) : val);
        }

        const data: IdCardPdfData = {
          rtl,
          centerName,
          studentName: profile.student.name,
          studentPhone: profile.student.phone || "-",
          className: profile.groups[0]?.name || null,
          enrolledDate,
          studentId: profile.student.id.split("-")[0].toUpperCase(),
          labels: {
            studentId: t("students.idCard.idLabel", "ID:"),
            phone: t("students.fields.phone"),
            class: t("students.fields.class"),
            enrolled: t("students.fields.enrolledOn"),
          },
        };

        await exportIdCardPdf(data);
        toast(t("students.idCard.success"), "success");
      } catch (error) {
        console.error("Failed to export ID card:", error);
        toast(t("students.idCard.error"), "error");
      }
    },
    [t, i18n, teacherName]
  );

  return { handleExportIdCard };
}
