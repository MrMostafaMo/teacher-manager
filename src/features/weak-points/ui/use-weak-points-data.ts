import { useEffect, useMemo, useState } from "react";
import { listStudents } from "@/features/students/application/student-cases";
import { toast } from "@/lib/toast-store";
import { listMemberships } from "@/features/groups/application/group-cases";
import {
  listAllWeakPoints,
  type StudentWeakPoint,
} from "@/features/weak-points/application/weak-point-cases";

export interface WeakPointsPageData {
  rows: StudentWeakPoint[];
  students: { id: string; name: string }[];
  names: Map<string, string>;
  groupsByStudent: Map<string, Array<{ id: string; name: string }>>;
  loading: boolean;
  reload: () => void;
}

/** Loads all weak points, students and memberships for the page sections. */
export function useWeakPointsPageData(loadErrorMsg: string): WeakPointsPageData {
  const [rows, setRows] = useState<StudentWeakPoint[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [groupsByStudent, setGroupsByStudent] = useState<
    Map<string, Array<{ id: string; name: string }>>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [weakPoints, allStudents, memberships] = await Promise.all([
          listAllWeakPoints(),
          listStudents({ status: "all" }),
          listMemberships(),
        ]);
        if (cancelled) return;
        setRows(weakPoints);
        setStudents(allStudents);
        const map = new Map<string, Array<{ id: string; name: string }>>();
        for (const m of memberships) {
          const arr = map.get(m.studentId) ?? [];
          arr.push({ id: m.groupId, name: m.groupName });
          map.set(m.studentId, arr);
        }
        setGroupsByStudent(map);
      } catch (e) {
        console.error("Failed to load weak points", e);
        if (!cancelled) toast(loadErrorMsg, "error");
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
  return { rows, students, names, groupsByStudent, loading, reload };
}
