import { useEffect, useState } from "react";
import type { Student } from "@/lib/db/schema";
import { listStudents } from "@/features/students/application/student-cases";

/**
 * Fetch students once when `open` is true, and return the top matches
 * for a given query (fuzzy name match, case-insensitive).
 */
export function useStudentSearch(open: boolean, query: string, limit = 5) {
  const [all, setAll] = useState<Student[]>([]);

  useEffect(() => {
    if (!open) return;
    listStudents({ status: "all" })
      .then(setAll)
      .catch(() => setAll([]));
  }, [open]);

  if (!query.trim()) return [];
  const q = query.trim().toLowerCase();
  return all
    .filter((s) => s.name.toLowerCase().includes(q))
    .slice(0, limit);
}
