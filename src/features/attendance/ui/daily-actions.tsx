import { useTranslation } from "react-i18next";
import { formatDateString } from "@/lib/utils/format";
import type { StatusDraft } from "@/features/attendance/application/attendance-bulk";
import type { GroupWithCount } from "@/features/groups/infrastructure/group-repo";
import { BulkActions } from "./bulk-actions";
import { PrintRosterButton } from "./print-roster-button";

/**
 * Secondary action row for the daily view: bulk mark-all/reset plus the
 * printable-roster export. Hidden until a roster is loaded.
 */
export function DailyActions({
  date,
  groups,
  groupId,
  students,
  draft,
  saved,
  onDraftChange,
}: {
  date: string;
  groups: GroupWithCount[];
  groupId: string;
  students: Array<{ id: string; name: string }>;
  draft: StatusDraft;
  saved: StatusDraft;
  onDraftChange: (next: StatusDraft) => void;
}) {
  const { t } = useTranslation();
  if (students.length === 0) return null;
  const groupName = groups.find((g) => g.id === groupId)?.name ?? t("attendance.todayGroups");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <BulkActions students={students} draft={draft} saved={saved} onDraftChange={onDraftChange} />
      <PrintRosterButton
        dateLabel={formatDateString(date)}
        groupName={groupName}
        students={students}
        statuses={draft}
      />
    </div>
  );
}