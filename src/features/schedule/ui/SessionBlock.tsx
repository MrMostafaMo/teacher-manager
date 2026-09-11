import { useTranslation } from "react-i18next";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import type { SessionWithException } from "@/features/schedule/application/schedule-exceptions";
import { isOneOff } from "@/features/schedule/application/schedule-one-offs";
import type { GroupSession } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
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
import { SessionBlockActions, SessionBlockMenu } from "./session-block-actions";
import { SessionBlockBadges } from "./session-block-badges";

export function SessionBlock({
  placed,
  rangeStart,
  conflicted,
  deleting,
  date,
  movedToDate,
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
  /** Target date when a cancelled occurrence was moved to another day. */
  movedToDate: string | null;
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
  const oneOff = isOneOff(session);
  const moved = oneOff && session.movedFromSessionId != null;

  const start = toMin(session.startTime);
  const end = toMin(session.endTime);
  const top = ((start - rangeStart) / 60) * HOUR_PX + 2;
  const lines =
    2 + (session.room ? 1 : 0) + (conflicted && !cancelled ? 1 : 0) + (exception || oneOff ? 1 : 0);
  const height = Math.max(
    ((end - start) / 60) * HOUR_PX - 4,
    deleting ? CHIP_H : minBlockHeight(lines),
  );

  return (
    <SessionBlockMenu
      session={session}
      date={date}
      oneOff={oneOff}
      moved={moved}
      cancelled={cancelled}
      onEdit={onEdit}
      onDelete={onDelete}
      onAttend={onAttend}
      onOccurrence={onOccurrence}
    >
      <div
        tabIndex={0}
        role="group"
        aria-label={`${session.groupName} ${formatTime(session.startTime, hour24)}–${formatTime(session.endTime, hour24)}${oneOff ? ` ${t("schedule.exceptions.added")}` : ""}`}
        className={cn(
          "group absolute overflow-hidden rounded-lg border p-1.5 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          !exception && !oneOff && !deleting && "cursor-grab active:cursor-grabbing",
          pal.bg,
          pal.border,
          conflicted && "ring-1 ring-destructive/60",
          deleting && "ring-2 ring-destructive",
          cancelled && "opacity-70 ring-1 ring-destructive/40",
          oneOff && "ring-1 ring-success/40",
        )}
        style={{
          top,
          height,
          insetInlineStart: `calc(${(col / cols) * 100}% + 1px)`,
          width: `calc(${(1 / cols) * 100}% - 2px)`,
        }}
        draggable={!exception && !oneOff && !deleting}
        onDragStart={(e) => {
          if (exception || oneOff || deleting) {
            e.preventDefault();
            return;
          }
          e.dataTransfer.setData("text/plain", session.id);
          e.dataTransfer.effectAllowed = "move";
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
          <SessionBlockBadges
            exceptionType={exception?.type}
            oneOff={oneOff}
            movedToDate={movedToDate}
            movedFromDate={session.movedFromDate ?? null}
            conflicted={conflicted}
          />
        </div>

        <SessionBlockActions
          session={session}
          date={date}
          oneOff={oneOff}
          moved={moved}
          cancelled={cancelled}
          deleting={deleting}
          onEdit={onEdit}
          onDelete={onDelete}
          onAttend={onAttend}
          onOccurrence={onOccurrence}
        />
      </div>
    </SessionBlockMenu>
  );
}
