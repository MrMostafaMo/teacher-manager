import { useEffect, useState } from "react";
import { listMemberships } from "@/features/groups/application/group-cases";
import { compareGroupsByName } from "@/lib/utils/group-sort";

export interface Membership {
  id: string;
  name: string;
}

/** studentId → its memberships (one class per student since Phase 21+). */
export function useMemberships(): Map<string, Membership[]> {
  const [groupsByStudent, setGroupsByStudent] = useState<Map<string, Membership[]>>(new Map());

  useEffect(() => {
    let cancelled = false;
    void listMemberships()
      .then((memberships) => {
        const map = new Map<string, Membership[]>();
        for (const x of memberships) {
          const arr = map.get(x.studentId) ?? [];
          arr.push({ id: x.groupId, name: x.groupName });
          map.set(x.studentId, arr);
        }
        if (!cancelled) setGroupsByStudent(map);
      })
      .catch(() => {
        if (!cancelled) setGroupsByStudent(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return groupsByStudent;
}

/** Split rows into per-group sections (sorted by name) + an ungrouped bucket. */
export function buildSections<T>(
  rows: T[],
  groupsByStudent: Map<string, Membership[]>,
  keyOf: (row: T) => string,
): { sections: Array<{ id: string; name: string; list: T[] }>; ungrouped: T[] } {
  const byGroup = new Map<string, { id: string; name: string; list: T[] }>();
  const ungroupedList: T[] = [];
  for (const row of rows) {
    const groups = groupsByStudent.get(keyOf(row)) ?? [];
    if (groups.length === 0) {
      ungroupedList.push(row);
      continue;
    }
    for (const g of groups) {
      let sec = byGroup.get(g.id);
      if (!sec) {
        sec = { id: g.id, name: g.name, list: [] };
        byGroup.set(g.id, sec);
      }
      sec.list.push(row);
    }
  }
  const sorted = [...byGroup.values()].sort((a, b) => compareGroupsByName(a, b));
  return { sections: sorted, ungrouped: ungroupedList };
}
