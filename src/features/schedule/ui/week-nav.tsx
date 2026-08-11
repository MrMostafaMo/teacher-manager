import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WeekNavProps {
  rangeLabel: string;
  isCurrentWeek: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function WeekNav({ rangeLabel, isCurrentWeek, onPrev, onNext, onToday }: WeekNavProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-2">
      <Button variant="outline" size="sm" className="gap-1" onClick={onPrev}>
        <ChevronLeft className="size-4 rtl:rotate-180" />
        <span className="sr-only sm:not-sr-only">{t("common.previous")}</span>
      </Button>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium tabular-nums">{rangeLabel}</span>
        <Button variant="ghost" size="sm" disabled={isCurrentWeek} onClick={onToday}>
          {t("schedule.today")}
        </Button>
      </div>
      <Button variant="outline" size="sm" className="gap-1" onClick={onNext}>
        <span className="sr-only sm:not-sr-only">{t("common.next")}</span>
        <ChevronRight className="size-4 rtl:rotate-180" />
      </Button>
    </div>
  );
}
