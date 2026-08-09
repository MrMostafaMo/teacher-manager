import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: "active" | "inactive";
  className?: string;
}) {
  const { t } = useTranslation();
  const active = status === "active";
  return (
    <Badge variant={active ? "success" : "secondary"} className={cn("gap-1", className)}>
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", active ? "bg-success" : "bg-muted-foreground/50")}
      />
      {active ? t("students.statusActive") : t("students.statusInactive")}
    </Badge>
  );
}
