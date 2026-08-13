import { useTranslation } from "react-i18next";
import { ArrowRightLeft, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/shared/Field";
import { TimePicker } from "@/shared/TimePicker";

interface OccurrenceFieldsProps {
  mode: "cancel" | "move";
  onMode: (mode: "cancel" | "move") => void;
  startTime: string;
  endTime: string;
  room: string;
  errors: Record<string, string>;
  onStart: (v: string) => void;
  onEnd: (v: string) => void;
  onRoom: (v: string) => void;
}

/** Cancel/move toggle plus the optional "move to" time fields. */
export function OccurrenceFields({
  mode,
  onMode,
  startTime,
  endTime,
  room,
  errors,
  onStart,
  onEnd,
  onRoom,
}: OccurrenceFieldsProps) {
  const { t } = useTranslation();
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
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
      </div>

      {mode === "move" && (
        <div className="space-y-4 rounded-lg border p-3">
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
