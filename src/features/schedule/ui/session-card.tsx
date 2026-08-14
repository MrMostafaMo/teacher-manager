import { useTranslation } from "react-i18next";
import { CalendarCheck, Pencil, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import type { GroupSession } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { ConfirmDeleteButton } from "@/shared/ConfirmDeleteButton";
import { formatTime } from "@/lib/utils/format";
import { useTimeStore } from "@/lib/time-store";

export function SessionCard({
  session,
  memberCount,
  conflicted,
  deleting,
  onEdit,
  onDelete,
  onAttend,
}: {
  session: SessionWithGroup;
  memberCount: number;
  conflicted: boolean;
  deleting: boolean;
  onEdit: (s: GroupSession) => void;
  onDelete: () => void;
  onAttend: () => void;
}) {
  const { t } = useTranslation();
  const hour24 = useTimeStore((s) => s.hour24);
  return (
    <div
      className={cn(
        "rounded-lg border bg-muted/40 p-2.5",
        conflicted && "border-destructive/60 ring-1 ring-destructive/40",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{session.groupName}</p>
          <p className="text-xs text-muted-foreground">
            {formatTime(session.startTime, hour24)} – {formatTime(session.endTime, hour24)}
          </p>
          <p className="text-xs text-muted-foreground">
            {session.room ? `${t("schedule.room")}: ${session.room}` : t("schedule.noRoom")}
          </p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3" />
            {memberCount} {t("schedule.members")}
          </p>
          {conflicted && (
            <p className="text-xs font-medium text-destructive">{t("schedule.conflict")}</p>
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
