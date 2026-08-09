import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ZodError } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { groupSessionInputSchema } from "@/features/schedule/domain";
import {
  createSession,
  updateSession,
} from "@/features/schedule/application/schedule-cases";
import type { GroupSession, StudyGroup } from "@/lib/db/schema";
import { mapZodErrors } from "@/lib/utils/zod-errors";
import { TimePicker } from "@/shared/TimePicker";
import { Modal } from "@/shared/Modal";
import { Field } from "@/shared/Field";

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

interface ScheduleFormDialogProps {
  open: boolean;
  session: GroupSession | null;
  groups: StudyGroup[];
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  groupId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string;
}

const emptyForm: FormState = { groupId: "", dayOfWeek: 0, startTime: "", endTime: "", room: "" };

export function ScheduleFormDialog({
  open,
  session,
  groups,
  onClose,
  onSaved,
}: ScheduleFormDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fatal, setFatal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        groupId: session?.groupId ?? groups[0]?.id ?? "",
        dayOfWeek: session?.dayOfWeek ?? 0,
        startTime: session?.startTime ?? "",
        endTime: session?.endTime ?? "",
        room: session?.room ?? "",
      });
      setErrors({});
      setFatal("");
    }
  }, [open, session, groups]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const mapErrors = (error: ZodError) =>
    mapZodErrors(error, (field, issue) => {
      if (field === "groupId") return t("schedule.errors.groupRequired");
      if (issue.message === "end after start") return t("schedule.errors.endAfterStart");
      if (issue.message === "invalid time") return t("schedule.errors.timeRequired");
      return t("schedule.errors.tooLong");
    });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrors({});
    setFatal("");
    try {
      groupSessionInputSchema.parse(form);
      if (session) await updateSession(session.id, form);
      else await createSession(form);
      onSaved();
      onClose();
    } catch (error) {
      if (error instanceof ZodError) setErrors(mapErrors(error));
      else setFatal(String(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={session ? t("schedule.edit") : t("schedule.add")}>
      <form onSubmit={handleSubmit} className="space-y-4">
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
                {t(`schedule.days.${["sun", "mon", "tue", "wed", "thu", "fri", "sat"][d]}`)}
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

        {fatal && <p className="text-sm text-destructive">{fatal}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            {t("schedule.cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t("schedule.saving") : t("schedule.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
