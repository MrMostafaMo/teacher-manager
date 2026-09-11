import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { formatDateString } from "@/lib/utils/format";
import { ExceptionBadge } from "./exception-badge";

interface SessionBlockBadgesProps {
  exceptionType?: "cancelled" | "moved";
  oneOff: boolean;
  /** Target date when a cancelled occurrence was moved to another day. */
  movedToDate: string | null;
  /** Source date when a one-off session is a cross-day move. */
  movedFromDate: string | null;
  conflicted: boolean;
}

/** Badge + conflict lines under a timetable block (one line each). */
export function SessionBlockBadges({
  exceptionType,
  oneOff,
  movedToDate,
  movedFromDate,
  conflicted,
}: SessionBlockBadgesProps) {
  const { t } = useTranslation();
  return (
    <>
      {oneOff ? (
        <ExceptionBadge
          type="added"
          suffix={
            movedFromDate
              ? `${t("schedule.oneOff.movedFrom")} ${formatDateString(movedFromDate)}`
              : undefined
          }
        />
      ) : exceptionType === "cancelled" && movedToDate ? (
        <ExceptionBadge
          type="moved"
          suffix={`${t("schedule.oneOff.movedTo")} ${formatDateString(movedToDate)}`}
        />
      ) : (
        exceptionType && <ExceptionBadge type={exceptionType} />
      )}
      {conflicted && exceptionType !== "cancelled" && (
        <p className="mt-0.5 flex items-center gap-0.5 text-[11px] font-medium leading-tight text-destructive">
          <AlertTriangle className="size-3" />
          {t("schedule.conflict")}
        </p>
      )}
    </>
  );
}
