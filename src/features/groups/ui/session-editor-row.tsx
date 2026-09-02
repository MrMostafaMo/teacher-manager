import { useTranslation } from "react-i18next";
import { Check, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ConfirmDeleteButton } from "@/shared/ConfirmDeleteButton";
import { TimePicker } from "@/shared/TimePicker";
import { useTimeStore } from "@/lib/time-store";
import { formatTime } from "@/lib/utils/format";
import { DAYS, DAY_NAMES, type SessionDraft } from "./session-draft";

export function SessionViewRow({
  session,
  removingKey,
  onRemove,
  onStartEdit,
}: {
  session: SessionDraft;
  removingKey: string | null;
  onRemove: (k: string) => void;
  onStartEdit: (k: string) => void;
}) {
  const { t } = useTranslation();
  const hour24 = useTimeStore((s) => s.hour24);
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg bg-muted px-2.5 py-1.5 text-sm">
      <span className="truncate" dir="ltr">
        {t(`schedule.days.${DAY_NAMES[session.dayOfWeek]}`)} · {formatTime(session.startTime, hour24)}
        –{formatTime(session.endTime, hour24)}
        {session.room ? ` · ${session.room}` : ""}
      </span>
      <span className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon-xs" aria-label={t("groups.sessionEdit")} title={t("groups.sessionEdit")} onClick={() => onStartEdit(session.key)}>
          <Pencil className="size-3.5" />
        </Button>
        <ConfirmDeleteButton armed={removingKey === session.key} deleteLabel={t("groups.sessionRemove")} confirmLabel={t("groups.confirmDelete")} onDelete={() => onRemove(session.key)} />
      </span>
    </li>
  );
}

export function SessionEditRow({
  draft,
  error,
  onSave,
  onCancel,
  onUpdate,
}: {
  draft: SessionDraft;
  error: string;
  onSave: () => void;
  onCancel: () => void;
  onUpdate: (patch: Partial<SessionDraft>) => void;
}) {
  const { t } = useTranslation();
  return (
    <li className="rounded-lg bg-muted px-2.5 py-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t("schedule.fields.day")}</Label>
          <Select className="w-28" value={draft.dayOfWeek} onChange={(e) => onUpdate({ dayOfWeek: Number(e.target.value) })}>
            {DAYS.map((d) => (
              <option key={d} value={d}>{t(`schedule.days.${DAY_NAMES[d]}`)}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t("schedule.fields.startTime")}</Label>
          <TimePicker ariaLabel={t("schedule.fields.startTime")} className="w-28" value={draft.startTime} onChange={(v) => onUpdate({ startTime: v })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t("schedule.fields.endTime")}</Label>
          <TimePicker ariaLabel={t("schedule.fields.endTime")} className="w-28" value={draft.endTime} onChange={(v) => onUpdate({ endTime: v })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t("schedule.fields.room")}</Label>
          <Input className="h-9 w-28" value={draft.room} onChange={(e) => onUpdate({ room: e.target.value })} />
        </div>
        <Button type="button" size="sm" onClick={onSave} aria-label={t("groups.sessionSave")}>
          <Check />{t("groups.sessionSave")}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} aria-label={t("groups.sessionCancel")}>
          <X />{t("groups.sessionCancel")}
        </Button>
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </li>
  );
}
