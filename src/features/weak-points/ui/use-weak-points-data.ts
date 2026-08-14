import { useEffect, useMemo, useState } from "react";
import { listStudents } from "@/features/students/application/student-cases";
import {
  listAllWeakPoints,
  type StudentWeakPoint,
} from "@/features/weak-points/application/weak-point-cases";

export interface WeakPointsPageData {
  rows: StudentWeakPoint[];
  students: { id: string; name: string }[];
  names: Map<string, string>;
  loading: boolean;
  error: string;
  reload: () => void;
}

/** Loads all weak points + students for the page table and student picker. */
export function useWeakPointsPageData(loadErrorMsg: string): WeakPointsPageData {
  const [rows, setRows] = useState<StudentWeakPoint[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const [weakPoints, allStudents] = await Promise.all([
          listAllWeakPoints(),
          listStudents({ status: "all" }),
        ]);
        if (cancelled) return;
        setRows(weakPoints);
        setStudents(allStudents);
      } catch (e) {
        console.error("Failed to load weak points", e);
        if (!cancelled) setError(loadErrorMsg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, loadErrorMsg]);

  const names = useMemo(() => new Map(students.map((s) => [s.id, s.name])), [students]);
  const reload = () => setReloadKey((k) => k + 1);
  return { rows, students, names, loading, error, reload };
}