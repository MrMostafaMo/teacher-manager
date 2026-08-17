import { useCallback, useEffect, useState } from "react";
import { listGroups } from "@/features/groups/application/group-cases";
import { listSchedule } from "@/features/schedule/application/schedule-cases";
import { listScheduleExceptions } from "@/features/schedule/application/schedule-exception-cases";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import type { SessionException, StudyGroup } from "@/lib/db/schema";

export interface ScheduleData {
  sessions: SessionWithGroup[];
  groups: StudyGroup[];
  memberCounts: Record<string, number>;
  exceptions: SessionException[];
  loading: boolean;
  reload: () => Promise<void>;
} /** Loads schedule data on mount and re-fetches on every `reload()` call. */
export function useScheduleData(): ScheduleData {
  const [sessions, setSessions] = useState<SessionWithGroup[]>([]);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [exceptions, setExceptions] = useState<SessionException[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [all, allGroups, allExceptions] = await Promise.all([
        listSchedule(),
        listGroups(),
        listScheduleExceptions(),
      ]);
      setSessions(all);
      setGroups(allGroups.filter((g) => g.status === "active"));
      setMemberCounts(Object.fromEntries(allGroups.map((g) => [g.id, g.memberCount])));
      setExceptions(allExceptions);
    } catch (error) {
      console.error("Failed to load schedule", error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { sessions, groups, memberCounts, exceptions, loading, reload };
}
