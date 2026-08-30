import { useCallback, useState } from "react";
import type { Student } from "@/lib/db/schema";
import { deleteStudent } from "@/features/students/application/student-cases";

export function useStudentBulkSelection(reload: () => Promise<void>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggleAllSelection = useCallback((list: Student[], checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      list.forEach((s) => {
        if (checked) next.add(s.id);
        else next.delete(s.id);
      });
      return next;
    });
  }, []);

  const handleBulkDelete = useCallback(
    async (confirmMessage: string) => {
      if (selectedIds.size === 0) return;
      if (!window.confirm(confirmMessage)) return;
      try {
        for (const id of selectedIds) {
          await deleteStudent(id);
        }
        setSelectedIds(new Set());
        void reload();
      } catch (e) {
        console.error("Bulk delete failed", e);
      }
    },
    [selectedIds, reload],
  );

  return { selectedIds, toggleSelection, toggleAllSelection, handleBulkDelete };
}
