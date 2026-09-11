import { useState, type FormEvent } from "react";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { useTranslation } from "react-i18next";
import type { ZodError } from "zod";
import { Button } from "@/components/ui/button";
import { moveAcrossDaysSchema, moveSessionSchema } from "@/features/schedule/domain";
import {
  cancelOccurrence,
  moveOccurrence,
} from "@/features/schedule/application/schedule-exception-cases";
import { moveOccurrenceAcrossDays } from "@/features/schedule/application/schedule-move-day-cases";
import { OccurrenceConflictError } from "@/features/schedule/application/schedule-oneoff-cases";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import { formatDateString } from "@/lib/utils/format";
import { mapZodErrors } from "@/lib/utils/zod-errors";
import { notifyUndo } from "@/lib/undo-store";
import { toast } from "@/lib/toast-store";
import { OccurrenceFields, type OccurrenceMode } from "./occurrence-fields";

interface OccurrenceFormProps {
  session: SessionWithGroup;
  date: string;
  onSaved: () => void;
  onClose: () => void;
}

/** Cancel / same-day move / move-to-another-day form for one occurrence. */
export function OccurrenceForm({ session, date, onSaved, onClose }: OccurrenceFormProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<OccurrenceMode>("cancel");
  const [targetDate, setTargetDate] = useState(date);
  const [startTime, setStartTime] = useState(session.startTime);
  const [endTime, setEndTime] = useState(session.endTime);
  const [room, setRoom] = useState(session.room ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const mapErrors = (error: ZodError) =>
    mapZodErrors(error, (_field, issue) => {
      if (issue.message === "end after start") return t("schedule.exceptions.endAfterStart");
      if (issue.message === "invalid time") return t("schedule.exceptions.timeRequired");
      if (issue.message === "different date") return t("schedule.exceptions.differentDate");
      return t("schedule.exceptions.tooLong");
    });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrors({});
    try {
      if (mode === "cancel") {
        await cancelOccurrence(session.id, date);
      } else if (mode === "move") {
        const parsed = moveSessionSchema.safeParse({ sessionId: session.id, date, startTime, endTime, room });
        if (!parsed.success) {
          setErrors(mapErrors(parsed.error));
          return;
        }
        await moveOccurrence(session.id, date, parsed.data.startTime, parsed.data.endTime, parsed.data.room || undefined);
      } else {
        const parsed = moveAcrossDaysSchema.safeParse({
          sessionId: session.id,
          date,
          targetDate,
          startTime,
          endTime,
          room,
        });
        if (!parsed.success) {
          setErrors(mapErrors(parsed.error));
          return;
        }
        const undoId = await moveOccurrenceAcrossDays({
          sessionId: session.id,
          date,
          targetDate: parsed.data.targetDate,
          startTime: parsed.data.startTime,
          endTime: parsed.data.endTime,
          room: parsed.data.room || undefined,
        });
        if (undoId !== null) {
          notifyUndo(
            undoId,
            t("schedule.exceptions.moveToDay"),
            `${session.groupName} → ${formatDateString(parsed.data.targetDate)}`,
            t("undo.undo"),
          );
        }
      }
      onSaved();
      onClose();
    } catch (error) {
      if (error instanceof OccurrenceConflictError) toast(t("schedule.oneOff.conflictBlocked"), "error");
      else toast(getErrorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <OccurrenceFields
        mode={mode}
        onMode={setMode}
        targetDate={targetDate}
        startTime={startTime}
        endTime={endTime}
        room={room}
        errors={errors}
        onTargetDate={setTargetDate}
        onStart={setStartTime}
        onEnd={setEndTime}
        onRoom={setRoom}
      />


      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? t("schedule.saving") : t("schedule.save")}
        </Button>
      </div>
    </form>
  );
}
