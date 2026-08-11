import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/shared/DatePicker";

const inputClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring dark:bg-muted/50";

interface SessionAttendanceToolbarProps {
  date: string;
  onDateChange: (date: string) => void;
  onSave: () => void;
  saving: boolean;
  disabled: boolean;
  saved: boolean;
}

export function SessionAttendanceToolbar({
  date,
  onDateChange,
  onSave,
  saving,
  disabled,
  saved,
}: SessionAttendanceToolbarProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {t("schedule.attendanceDate")}
        <DatePicker
          value={date}
          onChange={(v) => onDateChange(v || dayjs().format("YYYY-MM-DD"))}
          ariaLabel={t("schedule.attendanceDate")}
          className={inputClass}
        />
      </div>
      <Button onClick={onSave} disabled={saving || disabled}>
        {saving ? t("schedule.saving") : t("schedule.saveAttendance")}
      </Button>
      {saved && (
        <Badge className="gap-1 bg-success/10 text-success">
          <Check className="size-3.5" />
          {t("schedule.attendanceSaved")}
        </Badge>
      )}
    </div>
  );
}
