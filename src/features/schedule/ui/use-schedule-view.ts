import { useMemo } from "react";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import { DAYS } from "@/features/schedule/domain";
import { conflictIds } from "@/features/schedule/application/schedule-exceptions";
import { compareGroupsByName } from "@/lib/utils/group-sort";

/** Day buckets, room-conflict ids and group buckets derived from the sessions. */
export function useScheduleView(sessions: SessionWithGroup[]) {
  const byDay = useMemo(() => {
    const buckets: SessionWithGroup[][] = DAYS.map(() => []);
    for (const s of sessions) buckets[s.dayOfWeek].push(s);
    return buckets;
  }, [sessions]);

  /** Sessions sharing a day + room whose time ranges overlap (shared rule). */
  const conflicts = useMemo(() => conflictIds(byDay), [byDay]);

  const byGroup = useMemo(() => {
    const map = new Map<string, SessionWithGroup[]>();
    for (const s of sessions) {
      const list = map.get(s.groupId) ?? [];
      list.push(s);
      map.set(s.groupId, list);
    }
    return [...map.entries()].sort((a, b) =>
      compareGroupsByName({ name: a[1][0].groupName }, { name: b[1][0].groupName }),
    );
  }, [sessions]);

  return { byDay, conflicts, byGroup };
}
