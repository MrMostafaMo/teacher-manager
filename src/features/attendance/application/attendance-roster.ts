import dayjs from "dayjs";
import { groupRepository } from "@/features/groups/infrastructure/group-repo";
import { listSchedule } from "@/features/schedule/application/schedule-cases";
import { enrolledBy } from "@/lib/utils/enrollment";
import type { Student } from "@/lib/db/schema";

/** Members of the groups with a session on `date`'s weekday + whether any exist. */
export async function rosterForDate(date: string): Promise<{ students: Student[]; hasSessionsToday: boolean }> {
  const day = dayjs(date).day();
  const schedule = await listSchedule();
  const groupIds = [
    ...new Set(
      schedule
        .filter(
          (s) =>
            s.dayOfWeek === day &&
            s.groupStatus === "active" &&
            (s.groupStartsOn == null || s.groupStartsOn <= date),
        )
        .map((s) => s.groupId),
    ),
  ];
  if (groupIds.length === 0) return { students: [], hasSessionsToday: false };
  const members = await Promise.all(groupIds.map((id) => groupRepository.members(id)));
  const byId = new Map<string, Student>();
  for (const list of members) {
    for (const s of list) if (s.status === "active") byId.set(s.id, s);
  }
  return {
    students: [...byId.values()]
      .filter((s) => enrolledBy(s, date))
      .sort((a, b) => a.name.localeCompare(b.name)),
    hasSessionsToday: true,
  };
}
