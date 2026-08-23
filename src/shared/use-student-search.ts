import { useEffect, useState } from "react";
import type { Student } from "@/lib/db/schema";
import { listStudents } from "@/features/students/application/student-cases";

/**
 * Fetch students once when `open` is true, and return the top matches
 * for a given query (fuzzy name match, case-insensitive).
 */
export function useStudentSearch(open: boolean, query: string, limit = 5) {
  const [all, setAll] = useState<Student[]>([]);
  const [debounced, setDebounced] = useState(query);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query), 150);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    if (!open || !debounced.trim()) return;
    listStudents({ status: "all" })
      .then(setAll)
      .catch(() => setAll([]));
  }, [open, debounced]);

  if (!debounced.trim()) return [];
  const q = debounced.trim().toLowerCase();
  return all
    .filter((s) => s.name.toLowerCase().includes(q))
    .slice(0, limit);
}
