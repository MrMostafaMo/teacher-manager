import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ZodError } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { groupSessionInputSchema } from "@/features/schedule/domain";
import {
  createSession,
  updateSession,
} from "@/features/schedule/application/schedule-cases";
import type { GroupSession, StudyGroup } from "@/lib/db/schema";
import { TimePicker } from "@/shared/TimePicker";
import { Modal } from "@/features/students/ui/Modal";

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

  function mapErrors(error: ZodError): Record<string, string> {
    const mapped: Record<string, string> = {};
    for (const issue of error.issues) {
      const field = String(issue.path[0] ?? "");
      if (mapped[field]) continue;
      if (field === "groupId") mapped.groupId = t("schedule.errors.groupRequired");
      else if (issue.message === "end after start")
        mapped.endTime = t("schedule.errors.endAfterStart");
      else if (issue.message === "invalid time")
        mapped.startTime = t("schedule.errors.timeRequired");
      else mapped[field] = t("schedule.errors.tooLong");
    }
    return mapped;
  }

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
        <div className="space-y-1.5">
          <Label htmlFor="session-group">
            {t("schedule.fields.group")} <span className="text-destructive">*</span>
          </Label>
          <select
            id="session-group"
            value={form.groupId}
            onChange={(e) => setField("groupId", e.target.value)}
            aria-invalid={!!errors.groupId}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring dark:bg-muted/50"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          {errors.groupId && <p className="text-xs text-destructive">{errors.groupId}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="session-day">
            {t("schedule.fields.day")} <span className="text-destructive">*</span>
          </Label>
          <select
            id="session-day"
            value={form.dayOfWeek}
            onChange={(e) => setField("dayOfWeek", Number(e.target.value))}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring dark:bg-muted/50"
          >
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {t(`schedule.days.${["sun", "mon", "tue", "wed", "thu", "fri", "sat"][d]}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="session-start">
              {t("schedule.fields.startTime")} <span className="text-destructive">*</span>
            </Label>
            <TimePicker
              ariaLabel={t("schedule.fields.startTime")}
              className="w-full"
              value={form.startTime}
              onChange={(v) => setField("startTime", v)}
            />
            {errors.startTime && <p className="text-xs text-destructive">{errors.startTime}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="session-end">
              {t("schedule.fields.endTime")} <span className="text-destructive">*</span>
            </Label>
            <TimePicker
              ariaLabel={t("schedule.fields.endTime")}
              className="w-full"
              value={form.endTime}
              onChange={(v) => setField("endTime", v)}
            />
            {errors.endTime && <p className="text-xs text-destructive">{errors.endTime}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="session-room">{t("schedule.fields.room")}</Label>
          <Input
            id="session-room"
            value={form.room}
            onChange={(e) => setField("room", e.target.value)}
            aria-invalid={!!errors.room}
          />
          {errors.room && <p className="text-xs text-destructive">{errors.room}</p>}
        </div>

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
