import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { groupSessionInputSchema } from "@/features/schedule/domain";
import { listSchedule } from "@/features/schedule/application/schedule-cases";
import type { StudyGroup } from "@/lib/db/schema";
import { uuid } from "@/lib/utils/uuid";
import { useConfirmDelete } from "@/shared/useConfirmDelete";
import { emptyDraft, type SessionDraft } from "./SessionEditor";

/**
 * Owns the timetable editor state for the group form: the list of draft
 * sessions, the pending (day/start/end/room) draft row, validation errors,
 * and which session is currently awaiting delete confirmation.
 */
export function useGroupSessions(open: boolean, group: StudyGroup | null) {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<SessionDraft[]>([]);
  const [draft, setDraft] = useState<SessionDraft>({ key: "", ...emptyDraft });
  const [draftError, setDraftError] = useState("");
  const { armed: removingKey, request, clear } = useConfirmDelete();
  const loadedIds = useRef<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setSessions([]);
    setDraft({ key: "", ...emptyDraft });
    setDraftError("");
    clear();
    loadedIds.current = [];
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
    setSessions((s) => [
      ...s,
      { key: uuid(), dayOfWeek: draft.dayOfWeek, startTime: draft.startTime, endTime: draft.endTime, room: draft.room },
    ]);
    setDraft({ key: "", ...emptyDraft });
  }

  function updateDraft(patch: Partial<SessionDraft>) {
    setDraftError("");
    setDraft((d) => ({ ...d, ...patch }));
  }

  function removeSession(key: string) {
    if (!request(key)) return;
    clear();
    setSessions((s) => s.filter((x) => x.key !== key));
  }

  return { sessions, draft, draftError, removingKey, loadedIds, addSession, updateDraft, removeSession };
}
