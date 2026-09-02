import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { groupSessionInputSchema } from "@/features/schedule/domain";
import { listSchedule } from "@/features/schedule/application/schedule-cases";
import type { StudyGroup } from "@/lib/db/schema";
import { uuid } from "@/lib/utils/uuid";
import { useConfirmDelete } from "@/shared/useConfirmDelete";
import { emptyDraft, type SessionDraft } from "./session-draft";

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
  const initialById = useRef<Map<string, SessionDraft>>(new Map());
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<SessionDraft | null>(null);
  const [editingError, setEditingError] = useState("");

  useEffect(() => {
    if (!open) return;
    setSessions([]);
    setDraft({ key: "", ...emptyDraft });
    setDraftError("");
    setEditingKey(null);
    setEditingDraft(null);
    setEditingError("");
    clear();
    loadedIds.current = [];
    initialById.current = new Map();
    void listSchedule()
      .then((all) => {
        const own = all.filter((s) => s.groupId === group?.id);
        loadedIds.current = own.map((s) => s.id);
        const mapped = own.map((s) => ({
          key: s.id,
          id: s.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          room: s.room ?? "",
        }));
        initialById.current = new Map(mapped.map((m) => [m.key, { ...m }]));
        setSessions(mapped);
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
      {
        key: uuid(),
        dayOfWeek: draft.dayOfWeek,
        startTime: draft.startTime,
        endTime: draft.endTime,
        room: draft.room,
      },
    ]);
    setDraft({ key: "", ...emptyDraft });
  }

  function updateDraft(patch: Partial<SessionDraft>) {
    setDraftError("");
    setDraft((d) => ({ ...d, ...patch }));
  }

  function removeSession(key: string) {
    if (editingKey === key) {
      setEditingKey(null);
      setEditingDraft(null);
      setEditingError("");
    }
    if (!request(key)) return;
    clear();
    setSessions((s) => s.filter((x) => x.key !== key));
  }

  function startEdit(key: string) {
    const target = sessions.find((s) => s.key === key);
    if (!target) return;
    setEditingKey(key);
    setEditingDraft({ ...target });
    setEditingError("");
    clear();
  }

  function updateEditingDraft(patch: Partial<SessionDraft>) {
    setEditingError("");
    setEditingDraft((d) => (d ? { ...d, ...patch } : d));
  }

  function cancelEdit() {
    setEditingKey(null);
    setEditingDraft(null);
    setEditingError("");
  }

  function saveEdit() {
    if (!editingDraft || !editingKey) return;
    if (!editingDraft.startTime || !editingDraft.endTime) {
      setEditingError(t("groups.sessionTimesRequired"));
      return;
    }
    const parsed = groupSessionInputSchema.safeParse({ groupId: "x", ...editingDraft });
    if (!parsed.success) {
      const endAfterStart = parsed.error.issues.some(
        (i) => i.path[0] === "endTime" && i.message === "end after start",
      );
      setEditingError(endAfterStart ? t("groups.sessionEndAfterStart") : t("groups.sessionInvalid"));
      return;
    }
    if (
      sessions.some(
        (s) => s.key !== editingKey && s.dayOfWeek === editingDraft.dayOfWeek && s.startTime === editingDraft.startTime,
      )
    ) {
      setEditingError(t("groups.sessionDuplicate"));
      return;
    }
    setEditingError("");
    setSessions((prev) => prev.map((s) => (s.key === editingKey ? { ...editingDraft } : s)));
    setEditingKey(null);
    setEditingDraft(null);
  }

  return {
    sessions,
    draft,
    draftError,
    removingKey,
    loadedIds,
    initialById,
    editingKey,
    editingDraft,
    editingError,
    addSession,
    updateDraft,
    removeSession,
    startEdit,
    updateEditingDraft,
    cancelEdit,
    saveEdit,
  };
}
