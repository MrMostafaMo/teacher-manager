import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { useDialogStore } from "@/lib/dialog-store";
import { listGroups } from "@/features/groups/application/group-cases";
import type { StudyGroup } from "@/lib/db/schema";
import { StudentFormDialog } from "@/features/students/ui/StudentFormDialog";
import { RecordPaymentDialog } from "@/features/payments/ui/RecordPaymentDialog";
import { RecordExpenseDialog } from "@/features/expenses/ui/RecordExpenseDialog";
import { GroupFormDialog } from "@/features/groups/ui/GroupFormDialog";
import { ScheduleFormDialog } from "@/features/schedule/ui/ScheduleFormDialog";
import { HomeworkFormDialog } from "@/features/homework/ui/HomeworkFormDialog";
import { ExamFormDialog } from "@/features/exams/ui/ExamFormDialog";
import { SkillFormDialog } from "@/features/skills/ui/SkillFormDialog";

/** Fired after any global create dialog saves, so pages can refresh. */
export const DATA_CHANGED_EVENT = "tm:data-changed";

/**
 * Renders the cross-cutting create dialogs driven by the global dialog store
 * (command palette, dashboard quick actions). Each dialog is mounted once and
 * shown on demand; on save it closes itself and notifies the app to refresh.
 */
export function GlobalDialogs() {
  const dialog = useDialogStore((s) => s.dialog);
  const closeDialog = useDialogStore((s) => s.closeDialog);
  const [groups, setGroups] = useState<StudyGroup[]>([]);

  const needsGroups =
    dialog === "schedule" || dialog === "homework" || dialog === "exam";

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
    <>
      <StudentFormDialog
        open={dialog === "student"}
        student={null}
        onClose={closeDialog}
        onSaved={handleSaved}
      />
      <RecordPaymentDialog
        open={dialog === "payment"}
        defaultPeriod={dayjs().format("YYYY-MM")}
        onClose={closeDialog}
        onSaved={handleSaved}
      />
      <RecordExpenseDialog open={dialog === "expense"} onClose={closeDialog} onSaved={handleSaved} />
      <GroupFormDialog open={dialog === "group"} group={null} onClose={closeDialog} onSaved={handleSaved} />
      <ScheduleFormDialog
        open={dialog === "schedule"}
        session={null}
        groups={groups}
        onClose={closeDialog}
        onSaved={handleSaved}
      />
      <HomeworkFormDialog
        open={dialog === "homework"}
        homework={null}
        groups={groups}
        onClose={closeDialog}
        onSaved={handleSaved}
      />
      <ExamFormDialog
        open={dialog === "exam"}
        exam={null}
        groups={groups}
        onClose={closeDialog}
        onSaved={handleSaved}
      />
      <SkillFormDialog open={dialog === "skill"} skill={null} onClose={closeDialog} onSaved={handleSaved} />
    </>
  );
}
