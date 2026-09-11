import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { StudyGroup } from "@/lib/db/schema";
import { DatePicker } from "@/shared/date-picker";
import { Field } from "@/shared/Field";
import { TimePicker } from "@/shared/TimePicker";

export interface OneOffFormValues {
  groupId: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
}

interface OneOffFormFieldsProps {
  form: OneOffFormValues;
  errors: Record<string, string>;
  groups: StudyGroup[];
  onChange: (patch: Partial<OneOffFormValues>) => void;
}

/** Group + date + time + room fields of the one-day session dialog. */
export function OneOffFormFields({ form, errors, groups, onChange }: OneOffFormFieldsProps) {
  const { t } = useTranslation();
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="oneoff-group" label={t("schedule.fields.group")} required error={errors.groupId}>
          <Select id="oneoff-group" value={form.groupId} onChange={(e) => onChange({ groupId: e.target.value })}>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="oneoff-date" label={t("schedule.attendanceDate")} required error={errors.date}>
          <DatePicker
            ariaLabel={t("schedule.attendanceDate")}
            className="w-full"
            value={form.date}
            onChange={(date) => onChange({ date })}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="oneoff-start"
          label={t("schedule.fields.startTime")}
          required
          error={errors.startTime}
        >
          <TimePicker
            ariaLabel={t("schedule.fields.startTime")}
            className="w-full"
            value={form.startTime}
            onChange={(startTime) => onChange({ startTime })}
          />
        </Field>
        <Field id="oneoff-end" label={t("schedule.fields.endTime")} required error={errors.endTime}>
          <TimePicker
            ariaLabel={t("schedule.fields.endTime")}
            className="w-full"
            value={form.endTime}
            onChange={(endTime) => onChange({ endTime })}
          />
        </Field>
      </div>
      <Field id="oneoff-room" label={t("schedule.fields.room")} error={errors.room}>
        <Input
          id="oneoff-room"
          value={form.room}
          onChange={(e) => onChange({ room: e.target.value })}
          aria-invalid={!!errors.room}
        />
      </Field>
    </>
  );
}
