import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { TimePicker } from "@/shared/TimePicker";
import { DAYS, DAY_NAMES, type SessionDraft } from "./session-draft";
import { SessionEditRow, SessionViewRow } from "./session-editor-row";

export { DAYS, DAY_NAMES, emptyDraft, type SessionDraft } from "./session-draft";

interface SessionEditorProps {
  sessions: SessionDraft[];
  draft: SessionDraft;
  draftError: string;
  removingKey: string | null;
  editingKey: string | null;
  editingDraft: SessionDraft | null;
  editingError: string;
  onAdd: () => void;
  onUpdateDraft: (patch: Partial<SessionDraft>) => void;
  onRemove: (key: string) => void;
  onStartEdit: (key: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onUpdateEditingDraft: (patch: Partial<SessionDraft>) => void;
}

export function SessionEditor({
  sessions,
  draft,
  draftError,
  removingKey,
  editingKey,
  editingDraft,
  editingError,
  onAdd,
  onUpdateDraft,
  onRemove,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onUpdateEditingDraft,
}: SessionEditorProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1.5">
      <Label >{t("groups.fields.schedule")}</Label>
      <div className="space-y-2">
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("groups.sessionsEmpty")}</p>
        ) : (
          <ul className="space-y-1">
            {sessions.map((s) =>
              editingKey === s.key && editingDraft ? (
                <SessionEditRow key={s.key} draft={editingDraft} error={editingError} onSave={onSaveEdit} onCancel={onCancelEdit} onUpdate={onUpdateEditingDraft} />
              ) : (
                <SessionViewRow key={s.key} session={s} removingKey={removingKey} onRemove={onRemove} onStartEdit={onStartEdit} />
              ),
            )}
          </ul>
        )}

        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="session-day" className="text-xs text-muted-foreground">
              {t("schedule.fields.day")}
            </Label>
            <Select
              id="session-day"
              className="w-28"
              value={draft.dayOfWeek}
              onChange={(e) => onUpdateDraft({ dayOfWeek: Number(e.target.value) })}
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {t(`schedule.days.${DAY_NAMES[d]}`)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="session-start" className="text-xs text-muted-foreground">
              {t("schedule.fields.startTime")}
            </Label>
            <TimePicker
              ariaLabel={t("schedule.fields.startTime")}
              className="w-28"
              value={draft.startTime}
              onChange={(v) => onUpdateDraft({ startTime: v })}
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
              onChange={(v) => onUpdateDraft({ endTime: v })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="session-room" className="text-xs text-muted-foreground">
              {t("schedule.fields.room")}
            </Label>
            <Input
              id="session-room"
              className="h-9 w-28"
              value={draft.room}
              onChange={(e) => onUpdateDraft({ room: e.target.value })}
            />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onAdd}>
            <Plus />
            {t("groups.sessionAdd")}
          </Button>
        </div>
        {draftError && <p className="text-xs text-destructive">{draftError}</p>}
      </div>
    </div>
  );
}
