import { Button } from "@/components/ui/button";
import type { GroupSession, StudyGroup } from "@/lib/db/schema";
import { useTranslation } from "react-i18next";
import { Modal } from "@/shared/Modal";
import { ScheduleFormFields } from "./schedule-form-fields";
import { OneOffFormFields } from "./oneoff-form-fields";
import { ScheduleKindToggle, type ScheduleKind } from "./schedule-kind-toggle";
import { useScheduleDialogForm } from "./use-schedule-dialog-form";

interface ScheduleFormDialogProps {
  open: boolean;
  session: GroupSession | null;
  groups: StudyGroup[];
  initialKind?: ScheduleKind;
  onClose: () => void;
  onSaved: () => void;
}

/** One dialog for both kinds: weekly sessions and extra one-day sessions. */
export function ScheduleFormDialog({
  open,
  session,
  groups,
  initialKind = "weekly",
  onClose,
  onSaved,
}: ScheduleFormDialogProps) {
  const { t } = useTranslation();
  const {
    editing,
    kind,
    setKind,
    weekly,
    setWeekly,
    oneoff,
    setOneoff,
    errors,
    saving,
    handleSubmit,
  } = useScheduleDialogForm(open, session, groups, initialKind, onClose, onSaved);
  const showWeekly = kind === "weekly" || editing;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        editing ? t("schedule.edit") : showWeekly ? t("schedule.add") : t("schedule.oneOff.add")
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!editing && <ScheduleKindToggle kind={kind} onChange={setKind} />}
        {showWeekly ? (
          <ScheduleFormFields
            form={weekly}
            errors={errors}
            groups={groups}
            setField={(k, v) => setWeekly((f) => ({ ...f, [k]: v }))}
          />
        ) : (
          <OneOffFormFields
            form={oneoff}
            errors={errors}
            groups={groups}
            onChange={(patch) => setOneoff((f) => ({ ...f, ...patch }))}
          />
        )}
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
