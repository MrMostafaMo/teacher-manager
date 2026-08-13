import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { ZodError } from "zod";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { moveSessionSchema } from "@/features/schedule/domain";
import {
  cancelOccurrence,
  moveOccurrence,
  restoreOccurrence,
} from "@/features/schedule/application/schedule-exception-cases";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import type { SessionException } from "@/lib/db/schema";
import { formatDateString } from "@/lib/utils/format";
import { mapZodErrors } from "@/lib/utils/zod-errors";
import { Modal } from "@/shared/Modal";
import { OccurrenceFields } from "./occurrence-fields";

interface SessionOccurrenceDialogProps {
  open: boolean;
  session: SessionWithGroup | null;
  date: string;
  exception: SessionException | null;
  onClose: () => void;
  onSaved: () => void;
}

export function SessionOccurrenceDialog({
  open,
  session,
  date,
  exception,
  onClose,
  onSaved,
}: SessionOccurrenceDialogProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"cancel" | "move">("cancel");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [room, setRoom] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fatal, setFatal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && session) {
      setMode("cancel");
      setStartTime(session.startTime);
      setEndTime(session.endTime);
      setRoom(session.room ?? "");
      setErrors({});
      setFatal("");
    }
  }, [open, session]);

  const mapMoveErrors = (error: ZodError) =>
    mapZodErrors(error, (_field, issue) => {
      if (issue.message === "end after start") return t("schedule.exceptions.endAfterStart");
      if (issue.message === "invalid time") return t("schedule.exceptions.timeRequired");
      return t("schedule.exceptions.tooLong");
    });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving || !session) return;
    setSaving(true);
    setErrors({});
    setFatal("");
    try {
      if (exception) {
        await restoreOccurrence(exception.id);
      } else if (mode === "cancel") {
        await cancelOccurrence(session.id, date);
      } else {
        const parsed = moveSessionSchema.safeParse({
          sessionId: session.id,
          date,
          startTime,
          endTime,
          room,
        });
        if (!parsed.success) {
          setErrors(mapMoveErrors(parsed.error));
          return;
        }
        await moveOccurrence(
          session.id,
          date,
          parsed.data.startTime,
          parsed.data.endTime,
          parsed.data.room || undefined,
        );
      }
      onSaved();
      onClose();
    } catch (error) {
      setFatal(String(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("schedule.exceptions.title")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {session?.groupName} · {date ? formatDateString(date) : ""}
        </p>

        {exception ? (
          <p className="text-sm">{t("schedule.exceptions.confirmRestore")}</p>
        ) : (
          <OccurrenceFields
            mode={mode}
            onMode={setMode}
            startTime={startTime}
            endTime={endTime}
            room={room}
            errors={errors}
            onStart={setStartTime}
            onEnd={setEndTime}
            onRoom={setRoom}
          />
        )}

        {fatal && <p className="text-sm text-destructive">{fatal}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={saving} className="gap-1.5">
            {exception && <Undo2 className="size-4" />}
            {saving
              ? t("schedule.saving")
              : exception
                ? t("schedule.exceptions.restore")
                : t("schedule.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
