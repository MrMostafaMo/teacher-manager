import { useEffect, useState, type FormEvent } from "react";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import type { ZodError } from "zod";
import { Button } from "@/components/ui/button";
import { oneOffSessionInputSchema } from "@/features/schedule/domain";
import {
  OccurrenceConflictError,
  createOneOffSession,
} from "@/features/schedule/application/schedule-oneoff-cases";
import type { StudyGroup } from "@/lib/db/schema";
import { mapZodErrors } from "@/lib/utils/zod-errors";
import { Modal } from "@/shared/Modal";
import { toast } from "@/lib/toast-store";
import { OneOffFormFields, type OneOffFormValues } from "./oneoff-form-fields";

interface OneOffSessionDialogProps {
  open: boolean;
  groups: StudyGroup[];
  initialDate?: string;
  onClose: () => void;
  onSaved: () => void;
}

/** Extra session of a group that fires on one date only (never weekly). */
export function OneOffSessionDialog({
  open,
  groups,
  initialDate,
  onClose,
  onSaved,
}: OneOffSessionDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<OneOffFormValues>({
    groupId: "",
    date: dayjs().format("YYYY-MM-DD"),
    startTime: "",
    endTime: "",
    room: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm((f) => ({
        groupId: f.groupId || groups[0]?.id || "",
        date: initialDate || dayjs().format("YYYY-MM-DD"),
        startTime: "",
        endTime: "",
        room: "",
      }));
      setErrors({});
    }
  }, [open, groups, initialDate]);

  const mapErrors = (error: ZodError) =>
    mapZodErrors(error, (field, issue) => {
      if (field === "groupId") return t("schedule.errors.groupRequired");
      if (field === "date") return t("schedule.exceptions.timeRequired");
      if (issue.message === "end after start") return t("schedule.errors.endAfterStart");
      if (issue.message === "invalid time") return t("schedule.errors.timeRequired");
      return t("schedule.errors.tooLong");
    });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrors({});
    try {
      const parsed = oneOffSessionInputSchema.safeParse({ ...form, room: form.room });
      if (!parsed.success) {
        setErrors(mapErrors(parsed.error));
        return;
      }
      await createOneOffSession({
        groupId: parsed.data.groupId,
        date: parsed.data.date,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        room: parsed.data.room || undefined,
      });
      onSaved();
      onClose();
    } catch (error) {
      if (error instanceof OccurrenceConflictError)
        toast(t("schedule.oneOff.conflictBlocked"), "error");
      else toast(getErrorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("schedule.oneOff.add")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <OneOffFormFields
          form={form}
          errors={errors}
          groups={groups}
          onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        />


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
