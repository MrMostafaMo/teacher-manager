import { useTranslation } from "react-i18next";
import { CalendarCheck, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import type { SessionWithException } from "@/features/schedule/application/schedule-exceptions";
import type { GroupSession } from "@/lib/db/schema";
import { ConfirmDeleteButton } from "@/shared/ConfirmDeleteButton";
import type { ReactNode } from "react";
import { SessionContextMenu } from "./session-context-menu";
import { routeSessionMenuItem, sessionMenuItems } from "./session-menu-items";
import type { PlacedSession } from "./week-layout";
import { BlockActions } from "./block-actions";

interface SessionBlockActionsProps {
  session: PlacedSession<SessionWithException>["session"];
  date: string;
  oneOff: boolean;
  moved: boolean;
  cancelled: boolean;
  deleting: boolean;
  onEdit: (s: GroupSession) => void;
  onDelete: (s: GroupSession) => void;
  onAttend: (s: SessionWithGroup) => void;
  onOccurrence: (s: SessionWithGroup, date: string) => void;
}

/** Right-click menu wrapping a block, mirroring its hover actions by state. */
export function SessionBlockMenu({
  session,
  date,
  oneOff,
  moved,
  cancelled,
  onEdit,
  onDelete,
  onAttend,
  onOccurrence,
  children,
}: Omit<SessionBlockActionsProps, "deleting"> & { children: ReactNode }) {
  return (
    <SessionContextMenu
      items={sessionMenuItems({ oneOff, moved, cancelled })}
      oneOff={oneOff}
      onItem={(item) =>
        routeSessionMenuItem(item, {
          onAttend: () => onAttend(session),
          onOccurrence: () => onOccurrence(session, date),
          onEdit: () => onEdit(session),
          onDelete: () => onDelete(session),
        })
      }
    >
      {children}
    </SessionContextMenu>
  );
}

/** Overlay + hover actions of a timetable block by its state. */
export function SessionBlockActions({
  session,
  date,
  oneOff,
  moved,
  cancelled,
  deleting,
  onEdit,
  onDelete,
  onAttend,
  onOccurrence,
}: SessionBlockActionsProps) {
  const { t } = useTranslation();
  if (deleting) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-card/90">
        <ConfirmDeleteButton
          armed
          deleteLabel={oneOff ? t("schedule.oneOff.delete") : t("schedule.delete")}
          confirmLabel={t("schedule.confirmDelete")}
          onDelete={() => onDelete(session)}
        />
      </div>
    );
  }
  if (cancelled) {
    return (
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
    );
  }
  if (oneOff) {
    return (
      <div className="absolute end-1 top-1 z-10 flex flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
        {moved && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="bg-card/80 hover:bg-card"
            aria-label={t("schedule.oneOff.restoreMoved")}
            title={t("schedule.oneOff.restoreMoved")}
            onClick={() => onOccurrence(session, date)}
          >
            <Undo2 />
          </Button>
        )}
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
          aria-label={t("schedule.oneOff.delete")}
          title={t("schedule.oneOff.delete")}
          onClick={() => onDelete(session)}
        >
          <Trash2 />
        </Button>
      </div>
    );
  }
  return (
    <BlockActions
      onOccurrence={() => onOccurrence(session, date)}
      onAttend={() => onAttend(session)}
      onEdit={() => onEdit(session)}
      onDelete={() => onDelete(session)}
    />
  );
}
