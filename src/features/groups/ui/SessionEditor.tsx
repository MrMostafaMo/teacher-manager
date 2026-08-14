import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ConfirmDeleteButton } from "@/shared/ConfirmDeleteButton";
import { TimePicker } from "@/shared/TimePicker";
import { useTimeStore } from "@/lib/time-store";
import { formatTime } from "@/lib/utils/format";

export const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;
export const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export interface SessionDraft {
  key: string;
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string;
}

export const emptyDraft = { dayOfWeek: 0, startTime: "", endTime: "", room: "" };

interface SessionEditorProps {
  sessions: SessionDraft[];
  draft: SessionDraft;
  draftError: string;
  removingKey: string | null;
  onAdd: () => void;
  onUpdateDraft: (patch: Partial<SessionDraft>) => void;
  onRemove: (key: string) => void;
}

export function SessionEditor({
  sessions,
  draft,
  draftError,
  removingKey,
  onAdd,
  onUpdateDraft,
  onRemove,
}: SessionEditorProps) {
  const { t } = useTranslation();
  const hour24 = useTimeStore((s) => s.hour24);
  return (
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
                <ConfirmDeleteButton
                  armed={removingKey === s.key}
                  deleteLabel={t("groups.sessionRemove")}
                  confirmLabel={t("groups.confirmDelete")}
                  onDelete={() => onRemove(s.key)}
                />
              </li>
            ))}
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
              className="h-8 w-28"
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
