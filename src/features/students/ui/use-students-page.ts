import { useCallback, useEffect, useState } from "react";
import {
  countStudents,
  listStudentsWithGroups,
} from "@/features/students/application/student-cases";
import type { Student } from "@/lib/db/schema";

/** Above this many rows sections give way to a flat server-paged table. */
export const GROUPED_LIMIT = 300;
export const PAGE_SIZE = 50;

/** Paged student loading with a global count (threshold decides the layout). */
export function useStudentsPageData(query: string, status: "all" | "active" | "inactive") {
  const [rows, setRows] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [groupsByStudent, setGroupsByStudent] = useState<
    Map<string, Array<{ id: string; name: string }>>
  >(new Map());

  useEffect(() => {
    setPage(0);
  }, [query, status]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const count = await countStudents({ query, status });
      setTotal(count);
      // Small lists stay grouped; large ones page server-side (flat).
      const filters =
        count > GROUPED_LIMIT
          ? { query, status, limit: PAGE_SIZE, offset: page * PAGE_SIZE }
          : { query, status };
      const { rows: rowsData, groupsByStudent: map } = await listStudentsWithGroups(filters);
      setRows(rowsData);
      setGroupsByStudent(map);
    } catch (error) {
      console.error("Failed to load students", error);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [query, status, page]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { rows, total, page, setPage, loading, groupsByStudent, reload, flat: total > GROUPED_LIMIT };
}
