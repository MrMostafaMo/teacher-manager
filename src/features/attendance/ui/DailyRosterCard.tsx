import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import type { AttendanceStatus } from "@/features/attendance/domain";
import type { Student } from "@/lib/db/schema";
import { CalendarOff } from "lucide-react";
import { CollapsibleSection } from "@/shared/CollapsibleSection";
import { EmptyState } from "@/shared/EmptyState";
import { TableRowsSkeleton } from "@/shared/Skeletons";
import { RosterTable } from "./RosterTable";
import { EmptyStudents } from "./EmptyStudents";

export function DailyRosterCard({
  loading,
  students,
  hasSessionsToday,
  sections,
  ungrouped,
  draft,
  onChange,
}: {
  loading: boolean;
  students: Student[];
  hasSessionsToday: boolean;
  sections: Array<{ id: string; name: string; list: Student[] }>;
  ungrouped: Student[];
  draft: Record<string, AttendanceStatus | undefined>;
  onChange: (studentId: string, status: AttendanceStatus) => void;
}) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <Card>
      <CardContent className="p-0">
        {loading && students.length === 0 ? (
          <TableRowsSkeleton rows={5} cols={3} />
        ) : students.length === 0 ? (
          hasSessionsToday ? (
            <EmptyStudents />
          ) : (
            <EmptyState icon={CalendarOff} title={t("attendance.noSessionsToday")} />
          )
        ) : (
          <div className="space-y-4 p-4">
            {sections.map((sec) => {
              const isCollapsed = !!collapsed[sec.id];
              return (
                <CollapsibleSection
                  key={sec.id}
                  title={sec.name}
                  meta={`${sec.list.length}`}
                  collapsed={isCollapsed}
                  onToggle={() => setCollapsed((c) => ({ ...c, [sec.id]: !isCollapsed }))}
                >
                  <RosterTable
                    list={sec.list}
                    groupLabel={sec.name}
                    draft={draft}
                    onChange={onChange}
                  />
                </CollapsibleSection>
              );
            })}
            {ungrouped.length > 0 && (
              <CollapsibleSection
                key="__ungrouped"
                title={t("students.ungrouped")}
                meta={`${ungrouped.length}`}
                collapsed={!!collapsed.__ungrouped}
                onToggle={() =>
                  setCollapsed((c) => ({ ...c, __ungrouped: !collapsed.__ungrouped }))
                }
              >
                <RosterTable
                  list={ungrouped}
                  groupLabel={t("students.ungrouped")}
                  draft={draft}
                  onChange={onChange}
                />
              </CollapsibleSection>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
