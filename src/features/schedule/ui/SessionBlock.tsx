import { useTranslation } from "react-i18next";
import { AlertTriangle, CalendarCheck, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import type { GroupSession } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils/format";
import { useTimeStore } from "@/lib/time-store";
import { CHIP_H, HOUR_PX, minBlockHeight, paletteFor, toMin, type PlacedSession } from "./week-layout";

export function SessionBlock({
  placed,
  rangeStart,
  conflicted,
  deleting,
  onEdit,
  onDelete,
  onAttend,
}: {
  placed: PlacedSession;
  rangeStart: number;
  conflicted: boolean;
  deleting: boolean;
  onEdit: (s: GroupSession) => void;
  onDelete: (s: GroupSession) => void;
  onAttend: (s: SessionWithGroup) => void;
}) {
  const { t } = useTranslation();
  const hour24 = useTimeStore((s) => s.hour24);
  const { session, col, cols } = placed;
  const pal = paletteFor(session.groupId);

  const start = toMin(session.startTime);
  const end = toMin(session.endTime);
  const top = ((start - rangeStart) / 60) * HOUR_PX + 2;
  const lines = 2 + (session.room ? 1 : 0) + (conflicted ? 1 : 0);
  const height = Math.max(
    ((end - start) / 60) * HOUR_PX - 4,
    deleting ? CHIP_H : minBlockHeight(lines),
  );

  return (
    <div
      className={cn(
        "group absolute overflow-hidden rounded-md border p-1.5 transition-shadow hover:shadow-md",
        pal.bg,
        pal.border,
        conflicted && "ring-1 ring-destructive/60",
        deleting && "ring-2 ring-destructive",
      )}
      style={{
        top,
        height,
        insetInlineStart: `calc(${(col / cols) * 100}% + 1px)`,
        width: `calc(${(1 / cols) * 100}% - 2px)`,
      }}
    >
      <div className={cn("absolute inset-y-1 start-0 w-1 rounded-full", pal.bar)} />

      <div className="min-w-0 ps-2 pe-1">
        <p className="truncate text-xs font-semibold leading-tight">{session.groupName}</p>
        <p className="mt-0.5 text-[11px] leading-tight tabular-nums text-muted-foreground">
          {formatTime(session.startTime, hour24)} – {formatTime(session.endTime, hour24)}
        </p>
        {session.room && (
          <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
            {t("schedule.room")}: {session.room}
          </p>
        )}
        {conflicted && (
          <p className="mt-0.5 flex items-center gap-0.5 text-[11px] font-medium leading-tight text-destructive">
            <AlertTriangle className="size-3" />
            {t("schedule.conflict")}
          </p>
        )}
      </div>

      {deleting ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-card/90">
          <Button
            variant="destructive"
            size="sm"
            className="h-6 gap-1 px-1.5 text-[11px]"
            aria-label={t("schedule.confirmDelete")}
            title={t("schedule.confirmDelete")}
            onClick={() => onDelete(session)}
          >
            <Trash2 className="size-3" />
            <span className="max-w-28 truncate">{t("schedule.confirmDelete")}</span>
          </Button>
        </div>
      ) : (
        <div className="absolute end-1 top-1 z-10 flex flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <Button
            variant="ghost"
            size="icon-xs"
            className="bg-card/80 hover:bg-card"
            aria-label={t("schedule.attend")}
            title={t("schedule.attend")}
            onClick={() => onAttend(session)}
          >
            <CalendarCheck />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="bg-card/80 hover:bg-card"
            aria-label={t("schedule.edit")}
            title={t("schedule.edit")}
            onClick={() => onEdit(session)}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="bg-card/80 hover:bg-card"
            aria-label={t("schedule.delete")}
            title={t("schedule.delete")}
            onClick={() => onDelete(session)}
          >
            <Trash2 />
          </Button>
        </div>
      )}
    </div>
  );
}
