import { useTranslation } from "react-i18next";
import { CheckCheck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isDirty,
  markAllPresent,
  type StatusDraft,
} from "@/features/attendance/application/attendance-bulk";

/**
 * Bulk roster actions: mark every listed student present in one tap, and a
 * reset that reverts the draft to the last saved statuses. The reset only
 * appears while the roster has unsaved changes.
 */
export function BulkActions({
  students,
  draft,
  saved,
  onDraftChange,
}: {
  students: Array<{ id: string }>;
  draft: StatusDraft;
  saved: StatusDraft;
  onDraftChange: (next: StatusDraft) => void;
}) {
  const { t } = useTranslation();
  if (students.length === 0) return null;
  const dirty = isDirty(draft, saved, students);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => onDraftChange(markAllPresent(draft, students))}
      >
        <CheckCheck />
        {t("attendance.markAllPresent")}
      </Button>
      {dirty && (
        <Button size="sm" variant="ghost" onClick={() => onDraftChange(saved)}>
          <RotateCcw />
          {t("attendance.resetDraft")}
        </Button>
      )}
    </div>
  );
}