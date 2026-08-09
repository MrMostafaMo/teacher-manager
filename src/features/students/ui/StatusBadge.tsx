import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: "active" | "inactive" }) {
  const { t } = useTranslation();
  return status === "active" ? (
    <Badge className="bg-success/10 text-success">
      {t("students.statusActive")}
    </Badge>
  ) : (
    <Badge variant="secondary">{t("students.statusInactive")}</Badge>
  );
}
