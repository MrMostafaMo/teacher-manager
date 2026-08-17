import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ZodError } from "zod";
import { Button } from "@/components/ui/button";
import { groupSessionInputSchema } from "@/features/schedule/domain";
import { createSession, updateSession } from "@/features/schedule/application/schedule-cases";
import type { GroupSession, StudyGroup } from "@/lib/db/schema";
import { mapZodErrors } from "@/lib/utils/zod-errors";
import { Modal } from "@/shared/Modal";
import { ScheduleFormFields, type ScheduleFormValues } from "./schedule-form-fields";

interface ScheduleFormDialogProps {
  open: boolean;
  session: GroupSession | null;
  groups: StudyGroup[];
  onClose: () => void;
  onSaved: () => void;
}

const emptyForm: ScheduleFormValues = {
  groupId: "",
  dayOfWeek: 0,
  startTime: "",
  endTime: "",
  room: "",
};

export function ScheduleFormDialog({
  open,
  session,
  groups,
  onClose,
  onSaved,
}: ScheduleFormDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<ScheduleFormValues>(emptyForm);
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

  function setField<K extends keyof ScheduleFormValues>(key: K, value: ScheduleFormValues[K]) {
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
        <ScheduleFormFields form={form} errors={errors} groups={groups} setField={setField} />

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
