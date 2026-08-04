import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: "active" | "inactive" }) {
  const { t } = useTranslation();
  return status === "active" ? (
    <Badge className="bg-emerald-600/10 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
      {t("students.statusActive")}
    </Badge>
  ) : (
    <Badge variant="secondary">{t("students.statusInactive")}</Badge>
  );
}
