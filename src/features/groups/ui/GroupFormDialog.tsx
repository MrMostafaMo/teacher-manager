import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ZodError } from "zod";
import { Button } from "@/components/ui/button";
import { studyGroupInputSchema } from "@/features/groups/domain";
import { createGroup, updateGroup } from "@/features/groups/application/group-cases";
import { createSession, deleteSession } from "@/features/schedule/application/schedule-cases";
import type { StudyGroup } from "@/lib/db/schema";
import { mapZodErrors } from "@/lib/utils/zod-errors";
import { Modal } from "@/shared/Modal";
import { SessionEditor } from "./SessionEditor";
import { useGroupSessions } from "./use-group-sessions";
import { GroupFormFields, type GroupFormState } from "./group-form-fields";

interface GroupFormDialogProps {
  open: boolean;
  group: StudyGroup | null;
  onClose: () => void;
  onSaved: () => void;
}

const emptyForm: GroupFormState = {
  name: "",
  subject: "",
  startsOn: "",
  status: "active",
  notes: "",
};

export function GroupFormDialog({ open, group, onClose, onSaved }: GroupFormDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<GroupFormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fatal, setFatal] = useState("");
  const [saving, setSaving] = useState(false);
  const { sessions, draft, draftError, removingKey, loadedIds, addSession, updateDraft, removeSession } =
    useGroupSessions(open, group);
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
  }, [open, group]);

  const mapErrors = (error: ZodError) =>
    mapZodErrors(error, (field, issue) =>
      field === "name"
        ? issue.code === "too_small"
          ? t("groups.errors.nameRequired")
          : t("groups.errors.nameTooLong")
        : t("groups.errors.tooLong"),
    );

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
        if (!sessions.some((s) => s.id === id)) await deleteSession(id, { undo: false });
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
        <GroupFormFields
          form={form}
          errors={errors}
          onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        />

        <SessionEditor
          sessions={sessions}
          draft={draft}
          draftError={draftError}
          removingKey={removingKey}
          onAdd={addSession}
          onUpdateDraft={updateDraft}
          onRemove={removeSession}
        />

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
