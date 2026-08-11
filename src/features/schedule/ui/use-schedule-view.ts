import { useMemo } from "react";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import { DAYS } from "@/features/schedule/domain";

/** Day buckets, room-conflict ids and group buckets derived from the sessions. */
export function useScheduleView(sessions: SessionWithGroup[]) {
  const byDay = useMemo(() => {
    const buckets: SessionWithGroup[][] = DAYS.map(() => []);
    for (const s of sessions) buckets[s.dayOfWeek].push(s);
    return buckets;
  }, [sessions]);

  /** Sessions sharing a day + room whose time ranges overlap. */
  const conflicts = useMemo(() => {
    const ids = new Set<string>();
    for (const daySessions of byDay) {
      const byRoom = new Map<string, SessionWithGroup[]>();
      for (const s of daySessions) {
        if (!s.room) continue;
        const list = byRoom.get(s.room) ?? [];
        list.push(s);
        byRoom.set(s.room, list);
      }
      for (const roomSessions of byRoom.values()) {
        for (let i = 0; i < roomSessions.length; i++) {
          for (let j = i + 1; j < roomSessions.length; j++) {
            const a = roomSessions[i];
            const b = roomSessions[j];
            if (a.startTime < b.endTime && b.startTime < a.endTime) {
              ids.add(a.id);
              ids.add(b.id);
            }
          }
        }
      }
    }
    return ids;
  }, [byDay]);

  const byGroup = useMemo(() => {
    const map = new Map<string, SessionWithGroup[]>();
    for (const s of sessions) {
      const list = map.get(s.groupId) ?? [];
      list.push(s);
      map.set(s.groupId, list);
    }
    return [...map.entries()].sort((a, b) => a[1][0].groupName.localeCompare(b[1][0].groupName));
  }, [sessions]);

  return { byDay, conflicts, byGroup };
}
