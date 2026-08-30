import { useCallback, useState } from "react";
import { updateSession } from "@/features/schedule/application/schedule-cases";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import { toast } from "@/lib/toast-store";
import { useTranslation } from "react-i18next";
import { toMin } from "./week-layout";

function formatTimeLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function useScheduleDnD(
  sessions: SessionWithGroup[],
  reload: () => Promise<void>
) {
  const { t } = useTranslation();
  const [moving, setMoving] = useState<string | null>(null);

  const moveSession = useCallback(
    async (sessionId: string, newDay: number, newStartMin: number) => {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) return;

      const duration = toMin(session.endTime) - toMin(session.startTime);
      const newEndMin = newStartMin + duration;

      const newStart = formatTimeLabel(newStartMin);
      const newEnd = formatTimeLabel(newEndMin);

      // Optimistic or just loading
      setMoving(sessionId);
      try {
        await updateSession(sessionId, {
          groupId: session.groupId,
          dayOfWeek: newDay,
          startTime: newStart,
          endTime: newEnd,
          room: session.room ?? undefined,
        });
        await reload();
        toast(t("schedule.saved", "Saved"), "success");
      } catch (e) {
        console.error("Failed to move session", e);
        toast(t("schedule.saveError", "Failed to save"), "error");
      } finally {
        setMoving(null);
      }
    },
    [sessions, reload, t]
  );

  return { moving, moveSession };
}
