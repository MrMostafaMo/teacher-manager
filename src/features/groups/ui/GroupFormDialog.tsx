import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ZodError } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { studyGroupInputSchema } from "@/features/groups/domain";
import { createGroup, updateGroup } from "@/features/groups/application/group-cases";
import { groupSessionInputSchema } from "@/features/schedule/domain";
import {
  createSession,
  deleteSession,
  listSchedule,
} from "@/features/schedule/application/schedule-cases";
import type { StudyGroup } from "@/lib/db/schema";
import { uuid } from "@/lib/utils/uuid";
import { formatTime } from "@/lib/utils/format";
import { useTimeStore } from "@/lib/time-store";
import { TimePicker } from "@/shared/TimePicker";
import { DatePicker } from "@/shared/DatePicker";
import { Modal } from "@/features/students/ui/Modal";

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;
const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

interface SessionDraft {
  key: string;
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string;
}

interface GroupFormDialogProps {
  open: boolean;
  group: StudyGroup | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  name: string;
  subject: string;
  startsOn: string;
  status: "active" | "inactive";
  notes: string;
}

const emptyForm: FormState = {
  name: "",
  subject: "",
  startsOn: "",
  status: "active",
  notes: "",
};
const emptyDraft = { dayOfWeek: 0, startTime: "", endTime: "", room: "" };

export function GroupFormDialog({ open, group, onClose, onSaved }: GroupFormDialogProps) {
  const { t } = useTranslation();
  const hour24 = useTimeStore((s) => s.hour24);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fatal, setFatal] = useState("");
  const [saving, setSaving] = useState(false);
  const [sessions, setSessions] = useState<SessionDraft[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [draftError, setDraftError] = useState("");
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const loadedIds = useRef<string[]>([]);
  // Set once the group row itself has been written — if a later step (session
  // sync) fails, we must not let a resubmit create a duplicate group.
  const groupPersisted = useRef(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: group?.name ?? "",
      subject: group?.subject ?? "",
      startsOn: group?.startsOn ?? "",
      status: group?.status ?? "active",
      notes: group?.notes ?? "",
    });
    setErrors({});
    setFatal("");
    setSaving(false);
    setSessions([]);
    setDraft(emptyDraft);
    setDraftError("");
    setRemovingKey(null);
    loadedIds.current = [];
    groupPersisted.current = false;
    void listSchedule()
      .then((all) => {
        const own = all.filter((s) => s.groupId === group?.id);
        loadedIds.current = own.map((s) => s.id);
        setSessions(
          own.map((s) => ({
            key: s.id,
            id: s.id,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            room: s.room ?? "",
          })),
        );
      })
      .catch(() => setSessions([]));
  }, [open, group]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addSession() {
    if (!draft.startTime || !draft.endTime) {
      setDraftError(t("groups.sessionTimesRequired"));
      return;
    }
    const parsed = groupSessionInputSchema.safeParse({ groupId: "x", ...draft });
    if (!parsed.success) {
      const endAfterStart = parsed.error.issues.some(
        (i) => i.path[0] === "endTime" && i.message === "end after start",
      );
      setDraftError(endAfterStart ? t("groups.sessionEndAfterStart") : t("groups.sessionInvalid"));
      return;
    }
    if (sessions.some((s) => s.dayOfWeek === draft.dayOfWeek && s.startTime === draft.startTime)) {
      setDraftError(t("groups.sessionDuplicate"));
      return;
    }
    setDraftError("");
    setSessions((s) => [...s, { key: uuid(), ...draft }]);
    setDraft(emptyDraft);
  }

  function updateDraft(patch: Partial<SessionDraft>) {
    setDraftError("");
    setDraft((d) => ({ ...d, ...patch }));
  }

  function removeSession(key: string) {
    if (removingKey !== key) {
      setRemovingKey(key);
      setTimeout(() => setRemovingKey((cur) => (cur === key ? null : cur)), 2500);
      return;
    }
    setRemovingKey(null);
    setSessions((s) => s.filter((x) => x.key !== key));
  }

  function mapErrors(error: ZodError): Record<string, string> {
    const mapped: Record<string, string> = {};
    for (const issue of error.issues) {
      const field = String(issue.path[0] ?? "");
      if (mapped[field]) continue;
      mapped[field] =
        field === "name"
          ? issue.code === "too_small"
            ? t("groups.errors.nameRequired")
            : t("groups.errors.nameTooLong")
          : t("groups.errors.tooLong");
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
      const input = {
        ...form,
        schedule: group?.schedule ?? "",
      };
      studyGroupInputSchema.parse(input);
      const row = group ? await updateGroup(group.id, input) : await createGroup(input);
      groupPersisted.current = true;
      // Removed sessions first: re-adding a session at a freed (day, start)
      // slot must not collide with the still-present old row.
      for (const id of loadedIds.current) {
        if (!sessions.some((s) => s.id === id)) await deleteSession(id);
      }
      for (const s of sessions) {
        if (s.id) continue;
        await createSession({
          groupId: row.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          room: s.room || undefined,
        });
      }
      onSaved();
      onClose();
    } catch (error) {
      if (error instanceof ZodError) setErrors(mapErrors(error));
      else {
        setFatal(String(error));
        // The group already exists — closing prevents a retry from duplicating it.
        if (groupPersisted.current) {
          onSaved();
          onClose();
        }
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={group ? t("groups.edit") : t("groups.add")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="group-name">
            {t("groups.fields.name")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="group-name"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            aria-invalid={!!errors.name}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="group-subject">{t("groups.fields.subject")}</Label>
            <Input
              id="group-subject"
              value={form.subject}
              onChange={(e) => setField("subject", e.target.value)}
              aria-invalid={!!errors.subject}
            />
            {errors.subject && <p className="text-xs text-destructive">{errors.subject}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="group-status">{t("groups.fields.status")}</Label>
            <select
              id="group-status"
              value={form.status}
              onChange={(e) => setField("status", e.target.value as FormState["status"])}
              className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring dark:bg-muted"
            >
              <option value="active">{t("groups.statusActive")}</option>
              <option value="inactive">{t("groups.statusInactive")}</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="group-starts-on">{t("groups.fields.startsOn")}</Label>
          <DatePicker
            value={form.startsOn}
            onChange={(v) => setField("startsOn", v)}
            ariaLabel={t("groups.fields.startsOn")}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">{t("groups.startsOnHint")}</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="group-schedule">{t("groups.fields.schedule")}</Label>
          <div className="space-y-2">
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("groups.sessionsEmpty")}</p>
            ) : (
              <ul className="space-y-1">
                {sessions.map((s) => (
                  <li
                    key={s.key}
                    className="flex items-center justify-between gap-2 rounded-lg bg-muted px-2.5 py-1.5 text-sm"
                  >
                    <span className="truncate" dir="ltr">
                      {t(`schedule.days.${DAY_NAMES[s.dayOfWeek]}`)} · {formatTime(s.startTime, hour24)}
                      –{formatTime(s.endTime, hour24)}
                      {s.room ? ` · ${s.room}` : ""}
                    </span>
                    <Button
                      type="button"
                      variant={removingKey === s.key ? "destructive" : "ghost"}
                      size="icon-sm"
                      aria-label={
                        removingKey === s.key
                          ? t("groups.confirmDelete")
                          : t("groups.sessionRemove")
                      }
                      onClick={() => removeSession(s.key)}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="session-day" className="text-xs text-muted-foreground">
                  {t("schedule.fields.day")}
                </Label>
                <select
                  id="session-day"
                  value={draft.dayOfWeek}
                  onChange={(e) => updateDraft({ dayOfWeek: Number(e.target.value) })}
                  className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring dark:bg-muted"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {t(`schedule.days.${DAY_NAMES[d]}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="session-start" className="text-xs text-muted-foreground">
                  {t("schedule.fields.startTime")}
                </Label>
                <TimePicker
                  ariaLabel={t("schedule.fields.startTime")}
                  className="w-28"
                  value={draft.startTime}
                  onChange={(v) => updateDraft({ startTime: v })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="session-end" className="text-xs text-muted-foreground">
                  {t("schedule.fields.endTime")}
                </Label>
                <TimePicker
                  ariaLabel={t("schedule.fields.endTime")}
                  className="w-28"
                  value={draft.endTime}
                  onChange={(v) => updateDraft({ endTime: v })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="session-room" className="text-xs text-muted-foreground">
                  {t("schedule.fields.room")}
                </Label>
                <Input
                  id="session-room"
                  className="h-8 w-28"
                  value={draft.room}
                  onChange={(e) => updateDraft({ room: e.target.value })}
                />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addSession}>
                <Plus />
                {t("groups.sessionAdd")}
              </Button>
            </div>
            {draftError && <p className="text-xs text-destructive">{draftError}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="group-notes">{t("groups.fields.notes")}</Label>
          <textarea
            id="group-notes"
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
            placeholder={t("groups.notesPlaceholder")}
            className="min-h-24 w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring placeholder:text-muted-foreground dark:bg-muted"
          />
          {errors.notes && <p className="text-xs text-destructive">{errors.notes}</p>}
        </div>

        {fatal && <p className="text-sm text-destructive">{fatal}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            {t("groups.cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t("groups.saving") : t("groups.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
