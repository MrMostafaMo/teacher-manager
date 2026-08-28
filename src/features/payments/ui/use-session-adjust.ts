import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { addSession, removeSession } from "@/features/payments/application/session-adjust-cases";
import { toast } from "@/lib/toast-store";

export function useSessionAdjust(onDone: () => void) {
  const { t } = useTranslation();
  const [busyId, setBusyId] = useState<string | null>(null);
  const add = useCallback(
    async (studentId: string) => {
      setBusyId(studentId);
      try {
        await addSession(studentId);
        // ponytail: local refresh only — global remount would reset PaymentsPage tab to "dues"
        onDone();
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : String(e ?? "");
        const hint = msg.includes("no such column") ? ` — ${msg}` : "";
        toast(`${t("payments.sessions.adjustError")}${hint}`, "error");
      } finally {
        setBusyId(null);
      }
    },
    [t, onDone],
  );
  const remove = useCallback(
    async (studentId: string) => {
      setBusyId(studentId);
      try {
        await removeSession(studentId);
        // ponytail: local refresh only — global remount would reset PaymentsPage tab to "dues"
        onDone();
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : String(e ?? "");
        const hint = msg.includes("no such column") ? ` — ${msg}` : "";
        toast(`${t("payments.sessions.adjustError")}${hint}`, "error");
      } finally {
        setBusyId(null);
      }
    },
    [t, onDone],
  );
  return { busyId, add, remove };
}
