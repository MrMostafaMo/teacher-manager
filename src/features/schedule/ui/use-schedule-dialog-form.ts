import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { ZodError } from "zod";
import { groupSessionInputSchema, oneOffSessionInputSchema } from "@/features/schedule/domain";
import { createSession, updateSession } from "@/features/schedule/application/schedule-cases";
import {
  OccurrenceConflictError,
  createOneOffSession,
} from "@/features/schedule/application/schedule-oneoff-cases";
import type { GroupSession, StudyGroup } from "@/lib/db/schema";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { mapZodErrors } from "@/lib/utils/zod-errors";
import { toast } from "@/lib/toast-store";
import type { ScheduleFormValues } from "./schedule-form-fields";
import type { OneOffFormValues } from "./oneoff-form-fields";
import type { ScheduleKind } from "./schedule-kind-toggle";

const emptyWeekly: ScheduleFormValues = {
  groupId: "",
  dayOfWeek: 0,
  startTime: "",
  endTime: "",
  room: "",
};

/** Form state + submit for the merged weekly/one-day session dialog. */
export function useScheduleDialogForm(
  open: boolean,
  session: GroupSession | null,
  groups: StudyGroup[],
  initialKind: ScheduleKind,
  onClose: () => void,
  onSaved: () => void,
) {
  const { t } = useTranslation();
  const editing = session !== null;
  const [kind, setKind] = useState<ScheduleKind>(initialKind);
  const [weekly, setWeekly] = useState<ScheduleFormValues>(emptyWeekly);
  const [oneoff, setOneoff] = useState<OneOffFormValues>({
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
      setKind(editing ? "weekly" : initialKind);
      setWeekly({
        groupId: session?.groupId ?? groups[0]?.id ?? "",
        dayOfWeek: session?.dayOfWeek ?? 0,
        startTime: session?.startTime ?? "",
        endTime: session?.endTime ?? "",
        room: session?.room ?? "",
      });
      setOneoff({
        groupId: groups[0]?.id ?? "",
        date: dayjs().format("YYYY-MM-DD"),
        startTime: "",
        endTime: "",
        room: "",
      });
      setErrors({});
    }
  }, [open, session, groups, editing, initialKind]);

  function mapWeekly(error: ZodError) {
    return mapZodErrors(error, (field, issue) => {
      if (field === "groupId") return t("schedule.errors.groupRequired");
      if (issue.message === "end after start") return t("schedule.errors.endAfterStart");
      if (issue.message === "invalid time") return t("schedule.errors.timeRequired");
      return t("schedule.errors.tooLong");
    });
  }

  function mapOneoff(error: ZodError) {
    return mapZodErrors(error, (field, issue) => {
      if (field === "groupId") return t("schedule.errors.groupRequired");
      if (field === "date") return t("schedule.exceptions.timeRequired");
      if (issue.message === "end after start") return t("schedule.errors.endAfterStart");
      if (issue.message === "invalid time") return t("schedule.errors.timeRequired");
      return t("schedule.errors.tooLong");
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrors({});
    try {
      if (kind === "oneoff" && !editing) {
        const parsed = oneOffSessionInputSchema.safeParse({ ...oneoff, room: oneoff.room });
        if (!parsed.success) {
          setErrors(mapOneoff(parsed.error));
          return;
        }
        await createOneOffSession({
          groupId: parsed.data.groupId,
          date: parsed.data.date,
          startTime: parsed.data.startTime,
          endTime: parsed.data.endTime,
          room: parsed.data.room || undefined,
        });
      } else {
        groupSessionInputSchema.parse(weekly);
        if (session) await updateSession(session.id, weekly);
        else await createSession(weekly);
      }
      onSaved();
      onClose();
    } catch (error) {
      if (error instanceof ZodError) setErrors(mapWeekly(error));
      else if (error instanceof OccurrenceConflictError)
        toast(t("schedule.oneOff.conflictBlocked"), "error");
      else toast(getErrorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  }

  return {
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
  };
}
