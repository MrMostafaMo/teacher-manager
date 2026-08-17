import { useTranslation } from "react-i18next";
import { Ban, ArrowRightLeft, Pencil, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import type { GroupSession } from "@/lib/db/schema";
import { DAYS } from "@/features/schedule/domain";
import { cn } from "@/lib/utils";
import { ConfirmDeleteButton } from "@/shared/ConfirmDeleteButton";
import { formatTime } from "@/lib/utils/format";
import { useTimeStore } from "@/lib/time-store";
import { paletteFor } from "./week-layout";

export interface SessionExceptionChip {
  type: "cancelled" | "moved";
  count: number;
  dates: string[];
}

export function SessionCard({
  session,
  conflicted,
  deleting,
  upcomingExceptions,
  onEdit,
  onDelete,
  onAttend,
}: {
  session: SessionWithGroup;
  conflicted: boolean;
  deleting: boolean;
  upcomingExceptions?: SessionExceptionChip[];
  onEdit: (s: GroupSession) => void;
  onDelete: () => void;
  onAttend: () => void;
}) {
  const { t } = useTranslation();
  const hour24 = useTimeStore((s) => s.hour24);
  const pal = paletteFor(session.groupId);
  const dayKey = DAYS[session.dayOfWeek];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border bg-card p-2.5 ps-3.5",
        conflicted && "border-destructive/60 ring-1 ring-destructive/40",
      )}
    >
      <div className={cn("absolute inset-y-0 start-0 w-1", pal.bar)} />

      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <span className="inline-block rounded bg-muted/70 px-1.5 py-0.5 text-[11px] font-semibold leading-tight text-muted-foreground">
            {t(`schedule.days.${dayKey}`)}
          </span>
          <p className="mt-1 text-sm font-medium tabular-nums">
            {formatTime(session.startTime, hour24)} – {formatTime(session.endTime, hour24)}
          </p>
          <p className="text-xs text-muted-foreground">
            {session.room ? `${t("schedule.room")}: ${session.room}` : t("schedule.noRoom")}
          </p>
          {conflicted && (
            <p className="mt-0.5 text-xs font-medium text-destructive">{t("schedule.conflict")}</p>
          )}
          {upcomingExceptions && upcomingExceptions.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {upcomingExceptions.map((ex) => (
                <span
                  key={ex.type}
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium leading-tight",
                    ex.type === "cancelled"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                  )}
                  title={ex.dates.join(", ")}
                >
                  {ex.type === "cancelled" ? (
                    <Ban className="size-2.5" />
                  ) : (
                    <ArrowRightLeft className="size-2.5" />
                  )}
                  {t(`schedule.exceptions.${ex.type}`)}
                  {ex.count > 1 && ` ×${ex.count}`}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("schedule.attend")}
            onClick={onAttend}
          >
            <CalendarCheck />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("schedule.edit")}
            onClick={() => onEdit(session)}
          >
            <Pencil />
          </Button>
          <ConfirmDeleteButton
            armed={deleting}
            deleteLabel={t("schedule.delete")}
            confirmLabel={t("schedule.confirmDelete")}
            onDelete={onDelete}
          />
        </div>
      </div>
    </div>
  );
}
