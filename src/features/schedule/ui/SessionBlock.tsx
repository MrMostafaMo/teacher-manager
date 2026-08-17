import { useTranslation } from "react-i18next";
import { AlertTriangle, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import type { SessionWithException } from "@/features/schedule/application/schedule-exceptions";
import type { GroupSession } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { ConfirmDeleteButton } from "@/shared/ConfirmDeleteButton";
import { formatTime } from "@/lib/utils/format";
import { useTimeStore } from "@/lib/time-store";
import {
  CHIP_H,
  HOUR_PX,
  minBlockHeight,
  paletteFor,
  toMin,
  type PlacedSession,
} from "./week-layout";
import { ExceptionBadge } from "./exception-badge";
import { BlockActions } from "./block-actions";

export function SessionBlock({
  placed,
  rangeStart,
  conflicted,
  deleting,
  date,
  onEdit,
  onDelete,
  onAttend,
  onOccurrence,
}: {
  placed: PlacedSession<SessionWithException>;
  rangeStart: number;
  conflicted: boolean;
  deleting: boolean;
  date: string;
  onEdit: (s: GroupSession) => void;
  onDelete: (s: GroupSession) => void;
  onAttend: (s: SessionWithGroup) => void;
  onOccurrence: (s: SessionWithGroup, date: string) => void;
}) {
  const { t } = useTranslation();
  const hour24 = useTimeStore((s) => s.hour24);
  const { session, col, cols } = placed;
  const pal = paletteFor(session.groupId);

  const exception = session.exception;
  const cancelled = exception?.type === "cancelled";

  const start = toMin(session.startTime);
  const end = toMin(session.endTime);
  const top = ((start - rangeStart) / 60) * HOUR_PX + 2;
  const lines =
    2 + (session.room ? 1 : 0) + (conflicted && !cancelled ? 1 : 0) + (exception ? 1 : 0);
  const height = Math.max(
    ((end - start) / 60) * HOUR_PX - 4,
    deleting ? CHIP_H : minBlockHeight(lines),
  );

  return (
    <div
      className={cn(
        "group absolute overflow-hidden rounded-lg border p-1.5 transition-shadow hover:shadow-md",
        pal.bg,
        pal.border,
        conflicted && "ring-1 ring-destructive/60",
        deleting && "ring-2 ring-destructive",
        cancelled && "opacity-70 ring-1 ring-destructive/40",
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
        <p
          className={cn(
            "truncate text-xs font-semibold leading-tight",
            cancelled && "line-through",
          )}
        >
          {session.groupName}
        </p>
        <p className="mt-0.5 text-[11px] leading-tight tabular-nums text-muted-foreground">
          {formatTime(session.startTime, hour24)} – {formatTime(session.endTime, hour24)}
        </p>
        {session.room && (
          <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
            {t("schedule.room")}: {session.room}
          </p>
        )}
        {exception && <ExceptionBadge type={exception.type} />}
        {conflicted && !cancelled && (
          <p className="mt-0.5 flex items-center gap-0.5 text-[11px] font-medium leading-tight text-destructive">
            <AlertTriangle className="size-3" />
            {t("schedule.conflict")}
          </p>
        )}
      </div>

      {deleting ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-card/90">
          <ConfirmDeleteButton
            armed
            deleteLabel={t("schedule.delete")}
            confirmLabel={t("schedule.confirmDelete")}
            onDelete={() => onDelete(session)}
          />
        </div>
      ) : cancelled ? (
        <div className="absolute end-1 top-1 z-10">
          <Button
            variant="ghost"
            size="icon-xs"
            className="bg-card/80 hover:bg-card"
            aria-label={t("schedule.exceptions.restore")}
            title={t("schedule.exceptions.restore")}
            onClick={() => onOccurrence(session, date)}
          >
            <Undo2 />
          </Button>
        </div>
      ) : (
        <BlockActions
          onOccurrence={() => onOccurrence(session, date)}
          onAttend={() => onAttend(session)}
          onEdit={() => onEdit(session)}
          onDelete={() => onDelete(session)}
        />
      )}
    </div>
  );
}
