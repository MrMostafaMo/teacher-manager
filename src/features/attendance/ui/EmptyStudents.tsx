import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Users } from "lucide-react";
import { EmptyState } from "@/shared/EmptyState";

export function EmptyStudents() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={Users}
      title={t("attendance.empty")}
      description={
        <Link to="/students" className="text-primary hover:underline">
          {t("attendance.emptyHint")}
        </Link>
      }
    />
  );
}
