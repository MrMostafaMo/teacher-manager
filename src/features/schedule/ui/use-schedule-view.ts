import { useMemo } from "react";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import { DAYS } from "@/features/schedule/domain";
import { conflictIds } from "@/features/schedule/application/schedule-exceptions";
import { splitOccurrences } from "@/features/schedule/application/schedule-one-offs";
import { compareGroupsByName } from "@/lib/utils/group-sort";

/** Day buckets, room-conflict ids and group buckets derived from the sessions. */
export function useScheduleView(sessions: SessionWithGroup[]) {
  // One-offs fire on one date only — they never join the weekly buckets and
  // are injected into the visible week by the caller instead.
  const { recurring, oneOffs } = useMemo(() => splitOccurrences(sessions), [sessions]);

  const byDay = useMemo(() => {
    const buckets: SessionWithGroup[][] = DAYS.map(() => []);
    for (const s of recurring) buckets[s.dayOfWeek].push(s);
    return buckets;
  }, [recurring]);

  /** Sessions sharing a day + room whose time ranges overlap (shared rule). */
  const conflicts = useMemo(() => conflictIds(byDay), [byDay]);

  const byGroup = useMemo(() => {
    const map = new Map<string, SessionWithGroup[]>();
    for (const s of recurring) {
      const list = map.get(s.groupId) ?? [];
      list.push(s);
      map.set(s.groupId, list);
    }
    return [...map.entries()].sort((a, b) =>
      compareGroupsByName({ name: a[1][0].groupName }, { name: b[1][0].groupName }),
    );
  }, [recurring]);

  return { byDay, conflicts, byGroup, oneOffs };
}
