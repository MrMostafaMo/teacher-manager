import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import type { GroupSession } from "@/lib/db/schema";
import { SessionCard } from "./session-card";

interface ScheduleGroupsViewProps {
  byGroup: Array<[string, SessionWithGroup[]]>;
  memberCounts: Record<string, number>;
  conflicts: Set<string>;
  deletingId: string | null;
  onEdit: (session: GroupSession) => void;
  onDelete: (session: GroupSession) => void;
  onAttend: (session: SessionWithGroup) => void;
}

export function ScheduleGroupsView({
  byGroup,
  memberCounts,
  conflicts,
  deletingId,
  onEdit,
  onDelete,
  onAttend,
}: ScheduleGroupsViewProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      {byGroup.map(([groupId, groupSessions]) => (
        <Card key={groupId}>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">{groupSessions[0].groupName}</h3>
              <Badge variant="secondary">
                <Users className="size-3.5" />
                {memberCounts[groupId] ?? 0} {t("schedule.members")}
              </Badge>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {groupSessions.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  memberCount={memberCounts[s.groupId] ?? 0}
                  conflicted={conflicts.has(s.id)}
                  deleting={deletingId === s.id}
                  onEdit={onEdit}
                  onDelete={() => onDelete(s)}
                  onAttend={() => onAttend(s)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
