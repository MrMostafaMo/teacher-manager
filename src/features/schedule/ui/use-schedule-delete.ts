import { useTranslation } from "react-i18next";
import { deleteSession } from "@/features/schedule/application/schedule-cases";
import { deleteOneOffSession } from "@/features/schedule/application/schedule-oneoff-cases";
import { isOneOff } from "@/features/schedule/application/schedule-one-offs";
import type { GroupSession, StudyGroup } from "@/lib/db/schema";
import { notifyUndo } from "@/lib/undo-store";
import { useConfirmDelete } from "@/shared/useConfirmDelete";

/** Two-click delete for recurring and one-off sessions, with undo toasts. */
export function useScheduleDelete(groups: StudyGroup[], reload: () => Promise<void>) {
  const { t } = useTranslation();
  const { armed: deletingId, request, clear } = useConfirmDelete();

  async function handleDelete(session: GroupSession) {
    if (!request(session.id)) return;
    try {
      const extra = isOneOff(session);
      const undoId = extra
        ? await deleteOneOffSession(session.id)
        : await deleteSession(session.id);
      void reload();
      if (undoId !== null) {
        const groupName = groups.find((g) => g.id === session.groupId)?.name;
        notifyUndo(
          undoId,
          t("undo.deleted"),
          `${extra ? t("undo.oneOff") : t("undo.session")}: ${groupName ?? ""} ${session.startTime}`,
          t("undo.undo"),
        );
      }
    } catch (error) {
      console.error("Failed to delete session", error);
    } finally {
      clear();
    }
  }

  return { deletingId, handleDelete };
}
