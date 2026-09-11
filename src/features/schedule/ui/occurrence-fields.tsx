import { useTranslation } from "react-i18next";
import { ArrowRightLeft, Ban, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/shared/Field";
import { DatePicker } from "@/shared/date-picker";
import { TimePicker } from "@/shared/TimePicker";

export type OccurrenceMode = "cancel" | "move" | "move-day";

interface OccurrenceFieldsProps {
  mode: OccurrenceMode;
  onMode: (mode: OccurrenceMode) => void;
  targetDate: string;
  startTime: string;
  endTime: string;
  room: string;
  errors: Record<string, string>;
  onTargetDate: (v: string) => void;
  onStart: (v: string) => void;
  onEnd: (v: string) => void;
  onRoom: (v: string) => void;
}

/** Cancel/move/move-to-another-day toggle plus the "move to" fields. */
export function OccurrenceFields({
  mode,
  onMode,
  targetDate,
  startTime,
  endTime,
  room,
  errors,
  onTargetDate,
  onStart,
  onEnd,
  onRoom,
}: OccurrenceFieldsProps) {
  const { t } = useTranslation();
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          variant={mode === "cancel" ? "default" : "outline"}
          className="gap-1.5"
          aria-pressed={mode === "cancel"}
          onClick={() => onMode("cancel")}
        >
          <Ban className="size-4" />
          {t("schedule.exceptions.cancel")}
        </Button>
        <Button
          type="button"
          variant={mode === "move" ? "default" : "outline"}
          className="gap-1.5"
          aria-pressed={mode === "move"}
          onClick={() => onMode("move")}
        >
          <ArrowRightLeft className="size-4" />
          {t("schedule.exceptions.move")}
        </Button>
        <Button
          type="button"
          variant={mode === "move-day" ? "default" : "outline"}
          className="gap-1.5"
          aria-pressed={mode === "move-day"}
          onClick={() => onMode("move-day")}
        >
          <CalendarDays className="size-4" />
          {t("schedule.exceptions.moveToDay")}
        </Button>
      </div>

      {mode === "cancel" && (
        <p className="text-xs text-muted-foreground">{t("schedule.exceptions.cancelHint")}</p>
      )}

      {mode !== "cancel" && (
        <div className="space-y-4 rounded-lg border p-3">
          {mode === "move-day" && (
            <Field
              id="occ-target-date"
              label={t("schedule.exceptions.targetDate")}
              required
              error={errors.targetDate}
            >
              <DatePicker
                ariaLabel={t("schedule.exceptions.targetDate")}
                className="w-full"
                value={targetDate}
                onChange={onTargetDate}
              />
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="occ-start"
              label={t("schedule.fields.startTime")}
              required
              error={errors.startTime}
            >
              <TimePicker
                ariaLabel={t("schedule.fields.startTime")}
                className="w-full"
                value={startTime}
                onChange={onStart}
              />
            </Field>
            <Field
              id="occ-end"
              label={t("schedule.fields.endTime")}
              required
              error={errors.endTime}
            >
              <TimePicker
                ariaLabel={t("schedule.fields.endTime")}
                className="w-full"
                value={endTime}
                onChange={onEnd}
              />
            </Field>
          </div>
          <Field id="occ-room" label={t("schedule.fields.room")}>
            <Input
              id="occ-room"
              value={room}
              onChange={(e) => onRoom(e.target.value)}
              aria-invalid={!!errors.room}
            />
          </Field>
        </div>
      )}
    </>
  );
}
