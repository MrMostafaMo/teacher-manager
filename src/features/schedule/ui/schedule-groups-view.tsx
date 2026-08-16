import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import type { GroupSession, SessionException } from "@/lib/db/schema";
import { CollapsibleSection } from "@/shared/CollapsibleSection";
import { paletteFor } from "./week-layout";
import { upcomingExceptions } from "@/features/schedule/application/schedule-exceptions";
import { SessionCard } from "./session-card";

interface ScheduleGroupsViewProps {
  byGroup: Array<[string, SessionWithGroup[]]>;
  memberCounts: Record<string, number>;
  exceptions: SessionException[];
  today: string;
  isCollapsed: (id: string) => boolean;
  onToggle: (id: string) => void;
  conflicts: Set<string>;
  deletingId: string | null;
  onEdit: (session: GroupSession) => void;
  onDelete: (session: GroupSession) => void;
  onAttend: (session: SessionWithGroup) => void;
}

export function ScheduleGroupsView({
  byGroup,
  memberCounts,
  exceptions,
  today,
  isCollapsed,
  onToggle,
  conflicts,
  deletingId,
  onEdit,
  onDelete,
  onAttend,
}: ScheduleGroupsViewProps) {
  const { t } = useTranslation();

  const exceptionMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof upcomingExceptions>>();
    for (const [, sessions] of byGroup) {
      for (const s of sessions) {
        map.set(s.id, upcomingExceptions(exceptions, s.id, today));
      }
    }
    return map;
  }, [exceptions, today, byGroup]);

  return (
    <div className="space-y-4">
      {byGroup.map(([groupId, groupSessions]) => {
        const pal = paletteFor(groupId);
        const memberCount = memberCounts[groupId] ?? 0;
        return (
          <CollapsibleSection
            key={groupId}
            leading={
              <span className={`size-2.5 shrink-0 rounded-full ${pal.bar}`} aria-hidden="true" />
            }
            title={groupSessions[0].groupName}
            meta={`${groupSessions.length} ${t("schedule.view.sessionCount")} · ${memberCount} ${t("schedule.members")}`}
            collapsed={isCollapsed(groupId)}
            onToggle={() => onToggle(groupId)}
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {groupSessions.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  conflicted={conflicts.has(s.id)}
                  deleting={deletingId === s.id}
                  upcomingExceptions={exceptionMap.get(s.id)}
                  onEdit={onEdit}
                  onDelete={() => onDelete(s)}
                  onAttend={() => onAttend(s)}
                />
              ))}
            </div>
          </CollapsibleSection>
        );
      })}
    </div>
  );
}
