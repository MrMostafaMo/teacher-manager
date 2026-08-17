import { lazy, Suspense, useEffect, useState } from "react";
import dayjs from "dayjs";
import { useDialogStore } from "@/lib/dialog-store";
import { DATA_CHANGED_EVENT } from "@/lib/undo-store";
import { listGroups } from "@/features/groups/application/group-cases";
import type { StudyGroup } from "@/lib/db/schema";

/** Re-exported from the undo store so every dispatcher stays in sync. */
export { DATA_CHANGED_EVENT };

const StudentFormDialog = lazy(() =>
  import("@/features/students/ui/StudentFormDialog").then((m) => ({ default: m.StudentFormDialog })),
);
const RecordPaymentDialog = lazy(() =>
  import("@/features/payments/ui/RecordPaymentDialog").then((m) => ({
    default: m.RecordPaymentDialog,
  })),
);
const RecordExpenseDialog = lazy(() =>
  import("@/features/expenses/ui/RecordExpenseDialog").then((m) => ({
    default: m.RecordExpenseDialog,
  })),
);
const GroupFormDialog = lazy(() =>
  import("@/features/groups/ui/GroupFormDialog").then((m) => ({ default: m.GroupFormDialog })),
);
const ScheduleFormDialog = lazy(() =>
  import("@/features/schedule/ui/ScheduleFormDialog").then((m) => ({
    default: m.ScheduleFormDialog,
  })),
);
const HomeworkFormDialog = lazy(() =>
  import("@/features/homework/ui/HomeworkFormDialog").then((m) => ({
    default: m.HomeworkFormDialog,
  })),
);
const ExamFormDialog = lazy(() =>
  import("@/features/exams/ui/ExamFormDialog").then((m) => ({ default: m.ExamFormDialog })),
);
const SkillFormDialog = lazy(() =>
  import("@/features/skills/ui/SkillFormDialog").then((m) => ({ default: m.SkillFormDialog })),
);

/**
 * Renders the cross-cutting create dialogs driven by the global dialog store
 * (command palette, dashboard quick actions). Only the active dialog is mounted;
 * on save it closes itself and notifies the app to refresh.
 */
export function GlobalDialogs() {
  const dialog = useDialogStore((s) => s.dialog);
  const closeDialog = useDialogStore((s) => s.closeDialog);
  const [groups, setGroups] = useState<StudyGroup[]>([]);

  const needsGroups = dialog === "schedule" || dialog === "homework" || dialog === "exam";

  useEffect(() => {
    if (!needsGroups) return;
    void listGroups()
      .then(setGroups)
      .catch(() => setGroups([]));
  }, [needsGroups]);

  function handleSaved() {
    closeDialog();
    window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
  }

  return (
    <Suspense>
      {dialog === "student" && (
        <StudentFormDialog open student={null} onClose={closeDialog} onSaved={handleSaved} />
      )}
      {dialog === "payment" && (
        <RecordPaymentDialog
          open
          defaultPeriod={dayjs().format("YYYY-MM")}
          onClose={closeDialog}
          onSaved={handleSaved}
        />
      )}
      {dialog === "expense" && (
        <RecordExpenseDialog open onClose={closeDialog} onSaved={handleSaved} />
      )}
      {dialog === "group" && (
        <GroupFormDialog open group={null} onClose={closeDialog} onSaved={handleSaved} />
      )}
      {dialog === "schedule" && (
        <ScheduleFormDialog
          open
          session={null}
          groups={groups}
          onClose={closeDialog}
          onSaved={handleSaved}
        />
      )}
      {dialog === "homework" && (
        <HomeworkFormDialog open homework={null} groups={groups} onClose={closeDialog} onSaved={handleSaved} />
      )}
      {dialog === "exam" && (
        <ExamFormDialog open exam={null} groups={groups} onClose={closeDialog} onSaved={handleSaved} />
      )}
      {dialog === "skill" && (
        <SkillFormDialog open skill={null} onClose={closeDialog} onSaved={handleSaved} />
      )}
    </Suspense>
  );
}
