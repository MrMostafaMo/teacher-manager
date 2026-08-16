import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { GroupWithCount } from "@/features/groups/infrastructure/group-repo";
import { DatePicker } from "@/shared/DatePicker";

const inputClass =
  "h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring dark:bg-muted/50";

interface DailyToolbarProps {
  date: string;
  groups: GroupWithCount[];
  groupId: string;
  loading: boolean;
  saving: boolean;
  isFuture: boolean;
  saved: boolean;
  onDateChange: (d: string) => void;
  onGroupChange: (id: string) => void;
  onSave: () => void;
}

export function DailyToolbar({
  date,
  groups,
  groupId,
  loading,
  saving,
  isFuture,
  saved,
  onDateChange,
  onGroupChange,
  onSave,
}: DailyToolbarProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {t("attendance.date")}
        <DatePicker
          value={date}
          onChange={(v) => onDateChange(v || dayjs().format("YYYY-MM-DD"))}
          ariaLabel={t("attendance.date")}
          className={inputClass}
        />
      </div>
      <Select
        value={groupId}
        onChange={(e) => onGroupChange(e.target.value)}
        aria-label={t("attendance.groupFilter")}
        className="w-auto shrink-0"
      >
        <option value="">{t("attendance.todayGroups")}</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </Select>
      <Button onClick={onSave} disabled={saving || loading || isFuture}>
        {saving ? t("attendance.saving") : t("attendance.mark")}
      </Button>
      {isFuture && (
        <span className="text-sm text-muted-foreground">{t("attendance.futureLocked")}</span>
      )}
      {saved && (
        <Badge className="gap-1 bg-success/10 text-success">
          <Check className="size-3.5" />
          {t("attendance.saved")}
        </Badge>
      )}
    </div>
  );
}
