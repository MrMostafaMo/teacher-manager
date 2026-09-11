import { useTranslation } from "react-i18next";
import { CalendarCheck, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import type { GroupSession } from "@/lib/db/schema";
import { formatDateString, formatTime } from "@/lib/utils/format";
import { useTimeStore } from "@/lib/time-store";
import { ConfirmDeleteButton } from "@/shared/ConfirmDeleteButton";
import { SessionContextMenu } from "./session-context-menu";
import { routeSessionMenuItem, sessionMenuItems } from "./session-menu-items";

interface OneOffListProps {
  oneOffs: SessionWithGroup[];
  deletingId: string | null;
  onAttend: (s: SessionWithGroup) => void;
  onDelete: (s: GroupSession) => void;
  onOccurrence: (s: SessionWithGroup, date: string) => void;
}

/** Upcoming one-off (extra/moved) sessions of one group. */
export function OneOffList({
  oneOffs,
  deletingId,
  onAttend,
  onDelete,
  onOccurrence,
}: OneOffListProps) {
  const { t } = useTranslation();
  const hour24 = useTimeStore((s) => s.hour24);
  if (oneOffs.length === 0) return null;
  return (
    <div className="mt-2 space-y-1.5 border-t border-dashed pt-2">
      <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <CalendarPlus className="size-3.5" />
        {t("schedule.oneOff.upcoming")}
      </p>
      {oneOffs.map((o) => (
        <SessionContextMenu
          key={o.id}
          items={sessionMenuItems({
            oneOff: true,
            moved: o.movedFromSessionId != null,
            cancelled: false,
          })}
          oneOff
          onItem={(item) =>
            routeSessionMenuItem(item, {
              onAttend: () => onAttend(o),
              onOccurrence: () => onOccurrence(o, o.oneOffDate ?? ""),
              onDelete: () => onDelete(o),
            })
          }
        >
          <div className="flex items-center justify-between gap-1 rounded-lg bg-success/5 px-2 py-1.5 ring-1 ring-success/20">
            <div className="min-w-0 text-xs">
              <span className="font-medium tabular-nums">
                {o.oneOffDate ? formatDateString(o.oneOffDate) : ""}
              </span>{" "}
              <span className="tabular-nums text-muted-foreground">
                {formatTime(o.startTime, hour24)} – {formatTime(o.endTime, hour24)}
              </span>
              {o.room && <span className="text-muted-foreground"> · {o.room}</span>}
              {o.movedFromDate && (
                <span className="text-muted-foreground">
                  {" "}
                  · {t("schedule.oneOff.movedFrom")} {formatDateString(o.movedFromDate)}
                </span>
              )}
            </div>
            <div className="flex shrink-0 gap-0.5">
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={t("schedule.attend")}
                title={t("schedule.attend")}
                onClick={() => onAttend(o)}
              >
                <CalendarCheck />
              </Button>
              <ConfirmDeleteButton
                armed={deletingId === o.id}
                deleteLabel={t("schedule.oneOff.delete")}
                confirmLabel={t("schedule.confirmDelete")}
                onDelete={() => onDelete(o)}
              />
            </div>
          </div>
        </SessionContextMenu>
      ))}
    </div>
  );
}
