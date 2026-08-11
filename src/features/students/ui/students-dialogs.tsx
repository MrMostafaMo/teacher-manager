import type { Student } from "@/lib/db/schema";
import { StudentDetailDialog } from "./StudentDetailDialog";
import { StudentFormDialog } from "./StudentFormDialog";

export function StudentsDialogs({
  formOpen,
  editing,
  onCloseForm,
  onSaved,
  detail,
  onCloseDetail,
  onEdit,
  onDeleted,
}: {
  formOpen: boolean;
  editing: Student | null;
  onCloseForm: () => void;
  onSaved: () => void;
  detail: Student | undefined;
  onCloseDetail: () => void;
  onEdit: (student: Student) => void;
  onDeleted: () => void;
}) {
  return (
    <>
      <StudentFormDialog
        open={formOpen}
        student={editing}
        onClose={onCloseForm}
        onSaved={onSaved}
      />
      {detail && (
        <StudentDetailDialog
          student={detail}
          onClose={onCloseDetail}
          onEdit={() => onEdit(detail)}
          onDeleted={onDeleted}
        />
      )}
    </>
  );
}
