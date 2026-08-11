import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { SearchInput } from "@/shared/SearchInput";

export function StudentFilters({
  query,
  onQueryChange,
  status,
  onStatusChange,
  count,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  status: string;
  onStatusChange: (s: "all" | "active" | "inactive") => void;
  count: number;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchInput
        value={query}
        onChange={onQueryChange}
        placeholder={t("students.searchPlaceholder")}
        ariaLabel={t("students.searchPlaceholder")}
      />
      <Select
        value={status}
        onChange={(e) => onStatusChange(e.target.value as "all" | "active" | "inactive")}
        className="w-auto shrink-0"
      >
        <option value="all">{t("students.filterAll")}</option>
        <option value="active">{t("students.statusActive")}</option>
        <option value="inactive">{t("students.statusInactive")}</option>
      </Select>
      <Badge variant="secondary">
        <Users className="size-3.5" />
        {count}
      </Badge>
    </div>
  );
}
