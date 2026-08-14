import { memo, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/shared/DataTable";
import { ConfirmDeleteButton } from "@/shared/ConfirmDeleteButton";
import { StatusBadge } from "@/features/students/ui/StatusBadge";
import type { GroupWithCount } from "@/features/groups/infrastructure/group-repo";
import type { GroupSession, StudyGroup } from "@/lib/db/schema";
import { formatTime } from "@/lib/utils/format";
import { useTimeStore } from "@/lib/time-store";

const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function scheduleText(
  g: GroupWithCount,
  sessions: GroupSession[],
  hour24: boolean,
  t: (key: string) => string,
): string {
  if (sessions.length === 0) return g.schedule ?? "—";
  return sessions
    .map(
      (s) =>
        `${t(`schedule.days.${DAY_NAMES[s.dayOfWeek]}`)} ${formatTime(s.startTime, hour24)}–${formatTime(s.endTime, hour24)}`,
    )
    .join(" · ");
}

export const GroupsTable = memo(function GroupsTable({
  rows,
  deletingId,
  sessionsByGroup,
  onView,
  onOpen,
  onDelete,
}: {
  rows: GroupWithCount[];
  deletingId: string | null;
  sessionsByGroup: Record<string, GroupSession[]>;
  onView: (id: string) => void;
  onOpen: (group: StudyGroup) => void;
  onDelete: (group: StudyGroup) => void;
}) {
  const { t } = useTranslation();
  const hour24 = useTimeStore((s) => s.hour24);
  const columns = useMemo<DataTableColumn<GroupWithCount>[]>(
    () => [
      {
        header: t("groups.columns.name"),
        className: "font-medium",
        render: (g) => g.name,
      },
      {
        header: t("groups.columns.subject"),
        className: "text-muted-foreground",
        render: (g) => g.subject ?? "—",
      },
      {
        header: t("groups.columns.schedule"),
        className: "text-muted-foreground",
        render: (g) => scheduleText(g, sessionsByGroup[g.id] ?? [], hour24, t),
      },
      {
        header: t("groups.columns.members"),
        className: "text-muted-foreground tabular-nums",
        render: (g) => g.memberCount,
      },
      {
        header: t("groups.columns.status"),
        render: (g) => <StatusBadge status={g.status} />,
      },
      {
        header: "",
        className: "text-end",
        headerClassName: "text-end",
        render: (g) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("groups.view")}
              onClick={() => onView(g.id)}
            >
              <Eye />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("groups.edit")}
              onClick={() => onOpen(g)}
            >
              <Pencil />
            </Button>
            <ConfirmDeleteButton
              armed={deletingId === g.id}
              deleteLabel={t("groups.delete")}
              confirmLabel={t("groups.confirmDelete")}
              onDelete={() => void onDelete(g)}
            />
          </div>
        ),
      },
    ],
    [t, hour24, sessionsByGroup, deletingId, onView, onOpen, onDelete],
  );
  const getRowKey = useCallback((g: GroupWithCount) => g.id, []);
  return <DataTable<GroupWithCount> columns={columns} rows={rows} getRowKey={getRowKey} />;
});
