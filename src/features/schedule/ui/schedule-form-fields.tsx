import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { StudyGroup } from "@/lib/db/schema";
import { TimePicker } from "@/shared/TimePicker";
import { Field } from "@/shared/Field";

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export interface ScheduleFormValues {
  groupId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string;
}

interface ScheduleFormFieldsProps {
  form: ScheduleFormValues;
  errors: Record<string, string>;
  groups: StudyGroup[];
  setField: <K extends keyof ScheduleFormValues>(key: K, value: ScheduleFormValues[K]) => void;
}

export function ScheduleFormFields({ form, errors, groups, setField }: ScheduleFormFieldsProps) {
  const { t } = useTranslation();
  return (
    <>
      <Field id="session-group" label={t("schedule.fields.group")} required error={errors.groupId}>
        <Select
          id="session-group"
          value={form.groupId}
          onChange={(e) => setField("groupId", e.target.value)}
          aria-invalid={!!errors.groupId}
        >
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field id="session-day" label={t("schedule.fields.day")} required>
        <Select
          id="session-day"
          value={form.dayOfWeek}
          onChange={(e) => setField("dayOfWeek", Number(e.target.value))}
        >
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {t(`schedule.days.${DAY_KEYS[d]}`)}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="session-start" label={t("schedule.fields.startTime")} required error={errors.startTime}>
          <TimePicker
            ariaLabel={t("schedule.fields.startTime")}
            className="w-full"
            value={form.startTime}
            onChange={(v) => setField("startTime", v)}
          />
        </Field>
        <Field id="session-end" label={t("schedule.fields.endTime")} required error={errors.endTime}>
          <TimePicker
            ariaLabel={t("schedule.fields.endTime")}
            className="w-full"
            value={form.endTime}
            onChange={(v) => setField("endTime", v)}
          />
        </Field>
      </div>

      <Field id="session-room" label={t("schedule.fields.room")} error={errors.room}>
        <Input
          id="session-room"
          value={form.room}
          onChange={(e) => setField("room", e.target.value)}
          aria-invalid={!!errors.room}
        />
      </Field>
    </>
  );
}
