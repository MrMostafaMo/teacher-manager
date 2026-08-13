import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AttendanceStatus } from "@/features/attendance/domain";
import { saveDaily } from "@/features/attendance/application/attendance-cases";
import { useSaveFeedback } from "@/shared/useSaveFeedback";
import { toast } from "@/lib/toast-store";

/**
 * Save flow for the daily attendance sheet. Collects the explicitly marked
 * entries, persists them, and reports success via toast. Save errors are kept
 * local (surfaced as `saveError`) so load-time errors render separately.
 */
export function useDailySave({
  date,
  isFuture,
  students,
  draft,
  onSaved,
}: {
  date: string;
  isFuture: boolean;
  students: Array<{ id: string }>;
  draft: Record<string, AttendanceStatus | undefined>;
  onSaved: (statuses: Record<string, AttendanceStatus>) => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const { saving, saved, run } = useSaveFeedback();
  const [saveError, setSaveError] = useState("");

  async function handleSave() {
    // Persist one row per student with an explicit status; unmarked students
    // (future days / sessions that haven't started) are skipped so nothing is
    // recorded before the day's session begins.
    if (isFuture) return;
    const entries = students
      .map((s) => ({ studentId: s.id, status: draft[s.id] }))
      .filter(
        (e): e is { studentId: string; status: AttendanceStatus } => e.status != null,
      );
    if (entries.length === 0) return;
    setSaveError("");
    try {
      await run(async () => {
        await saveDaily({ date, entries });
        await onSaved(Object.fromEntries(entries.map((e) => [e.studentId, e.status])));
        toast(t("attendance.saved"));
      });
    } catch (e) {
      console.error("Failed to save attendance", e);
      setSaveError(t("attendance.errors.save"));
    }
  }

  return { saving, saved, saveError, handleSave };
}