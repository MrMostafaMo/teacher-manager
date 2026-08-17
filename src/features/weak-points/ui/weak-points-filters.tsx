import { useTranslation } from "react-i18next";
import { Select } from "@/components/ui/select";
import { SearchInput } from "@/shared/SearchInput";
import type { WeakPointStatusFilter } from "@/features/weak-points/application/weak-point-filter";

export function WeakPointsFilters({
  status,
  onStatusChange,
  query,
  onQueryChange,
}: {
  status: WeakPointStatusFilter;
  onStatusChange: (s: WeakPointStatusFilter) => void;
  query: string;
  onQueryChange: (q: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchInput
        value={query}
        onChange={onQueryChange}
        placeholder={t("weakPoints.searchPlaceholder")}
        ariaLabel={t("weakPoints.searchPlaceholder")}
      />
      <Select
        value={status}
        onChange={(e) => onStatusChange(e.target.value as WeakPointStatusFilter)}
        aria-label={t("weakPoints.filterAll")}
        className="w-auto shrink-0"
      >
        <option value="all">{t("weakPoints.filterAll")}</option>
        <option value="active">{t("weakPoints.filterActive")}</option>
        <option value="resolved">{t("weakPoints.filterResolved")}</option>
      </Select>
    </div>
  );
}
