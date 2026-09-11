import { useState, type FormEvent } from "react";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { useTranslation } from "react-i18next";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { restoreOccurrence } from "@/features/schedule/application/schedule-exception-cases";
import { restoreMovedOccurrence } from "@/features/schedule/application/schedule-move-day-cases";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import type { SessionException } from "@/lib/db/schema";
import { formatDateString } from "@/lib/utils/format";
import { Modal } from "@/shared/Modal";
import { notifyUndo } from "@/lib/undo-store";
import { toast } from "@/lib/toast-store";
import { OccurrenceForm } from "./OccurrenceForm";

interface SessionOccurrenceDialogProps {
  open: boolean;
  session: SessionWithGroup | null;
  date: string;
  exception: SessionException | null;
  /** Source date when the session is a one-off created by a cross-day move. */
  movedFrom: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export function SessionOccurrenceDialog({
  open,
  session,
  date,
  exception,
  movedFrom,
  onClose,
  onSaved,
}: SessionOccurrenceDialogProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const restoring = exception !== null || movedFrom !== null;

  async function handleRestore(e: FormEvent) {
    e.preventDefault();
    if (saving || !session) return;
    setSaving(true);
    try {
      if (movedFrom) {
        const undoId = await restoreMovedOccurrence(session.id);
        if (undoId !== null) {
          notifyUndo(
            undoId,
            t("schedule.oneOff.restoreMoved"),
            `${session.groupName} · ${formatDateString(date)}`,
            t("undo.undo"),
          );
        }
      } else if (exception) {
        await restoreOccurrence(exception.id);
      }
      onSaved();
      onClose();
    } catch (error) {
      toast(getErrorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("schedule.exceptions.title")}>
      {restoring ? (
        <form onSubmit={handleRestore} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {session?.groupName} · {date ? formatDateString(date) : ""}
          </p>
          <p className="text-sm">
            {movedFrom ? t("schedule.oneOff.restoreMoved") : t("schedule.exceptions.confirmRestore")}
          </p>


          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={saving} className="gap-1.5">
              <Undo2 className="size-4" />
              {saving ? t("schedule.saving") : t("schedule.exceptions.restore")}
            </Button>
          </div>
        </form>
      ) : (
        session && (
          <OccurrenceForm
            key={`${session.id}|${date}`}
            session={session}
            date={date}
            onSaved={onSaved}
            onClose={onClose}
          />
        )
      )}
    </Modal>
  );
}
