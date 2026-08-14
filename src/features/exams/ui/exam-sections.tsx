import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CollapsibleSection } from "@/shared/CollapsibleSection";
import type { Exam, StudyGroup } from "@/lib/db/schema";
import type { ExamListItem } from "@/features/exams/application/exam-cases";
import { ExamsTable } from "./exams-table";

interface ExamGroupSectionsProps {
  groups: StudyGroup[];
  rows: ExamListItem[];
  isCollapsed: (id: string) => boolean;
  deletingId: string | null;
  onToggle: (id: string) => void;
  onAdd: (groupId: string) => void;
  onDetail: (id: string) => void;
  onEdit: (exam: Exam) => void;
  onDelete: (id: string) => void;
}

export function ExamGroupSections({
  groups,
  rows,
  isCollapsed,
  deletingId,
  onToggle,
  onAdd,
  onDetail,
  onEdit,
  onDelete,
}: ExamGroupSectionsProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      {groups.map((g) => {
        const items = rows.filter((e) => e.groupId === g.id);
        const collapsed = isCollapsed(g.id);
        return (
          <CollapsibleSection
            key={g.id}
            title={g.name}
            meta={items.length}
            collapsed={collapsed}
            onToggle={() => onToggle(g.id)}
            actions={
              <Button size="sm" variant="outline" onClick={() => onAdd(g.id)}>
                <Plus />
                {t("exams.add")}
              </Button>
            }
          >
            {items.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t("exams.sectionEmpty")}
              </p>
            ) : (
              <ExamsTable
                items={items}
                deletingId={deletingId}
                onDetail={onDetail}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            )}
          </CollapsibleSection>
        );
      })}
    </div>
  );
}
