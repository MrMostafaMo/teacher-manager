import { useTranslation } from "react-i18next";
import { CalendarDays, CalendarPlus, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/shared/Segmented";

export function ScheduleHeaderActions({
  count,
  canAdd,
  view,
  onViewChange,
  onCreate,
  onCreateOneOff,
}: {
  count: number;
  canAdd: boolean;
  view: "day" | "group";
  onViewChange: (value: "day" | "group") => void;
  onCreate: () => void;
  onCreateOneOff: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Badge variant="secondary">
        <CalendarDays className="size-3.5" />
        {count}
      </Badge>
      <Segmented
        value={view}
        onChange={onViewChange}
        options={(["day", "group"] as const).map((v) => ({
          value: v,
          label: t(`schedule.view.${v}`),
        }))}
        ariaLabel={t("schedule.view.label")}
      />
      <Button variant="outline" onClick={onCreateOneOff} disabled={!canAdd}>
        <CalendarPlus />
        {t("schedule.oneOff.add")}
      </Button>
      <Button onClick={onCreate} disabled={!canAdd}>
        <Plus />
        {t("schedule.add")}
      </Button>
    </>
  );
}
