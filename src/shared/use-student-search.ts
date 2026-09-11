import { useEffect, useState } from "react";
import { studentRepository } from "@/features/students/infrastructure/student-repo";

type NameRow = { id: string; name: string };

/**
 * Debounced server-side name search (SQL LIKE + LIMIT) for pickers.
 */
export function useStudentSearch(open: boolean, query: string, limit = 5) {
  const [rows, setRows] = useState<NameRow[]>([]);
  const [debounced, setDebounced] = useState(query);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query), 150);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    if (!open || !debounced.trim()) {
      setRows([]);
      return;
    }
    studentRepository
      .searchNames({ status: "all", query: debounced.trim(), limit })
      .then((r) => setRows(r.map((s) => ({ id: s.id, name: s.name }))))
      .catch(() => setRows([]));
  }, [open, debounced, limit]);

  if (!debounced.trim()) return [];
  return rows;
}
