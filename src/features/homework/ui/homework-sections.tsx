import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CollapsibleSection } from "@/shared/CollapsibleSection";
import type { HomeworkListItem } from "@/features/homework/application/homework-cases";
import type { StudyGroup } from "@/lib/db/schema";
import { HomeworkTable } from "./homework-table";

interface HomeworksSectionProps {
  groups: StudyGroup[];
  rows: HomeworkListItem[];
  collapsed: Record<string, boolean>;
  deletingId: string | null;
  onToggle: (id: string) => void;
  onCreate: (groupId: string) => void;
  onDetail: (id: string) => void;
  onEdit: (h: HomeworkListItem) => void;
  onDelete: (id: string) => void;
}

export function HomeworksSection({
  groups,
  rows,
  collapsed,
  deletingId,
  onToggle,
  onCreate,
  onDetail,
  onEdit,
  onDelete,
}: HomeworksSectionProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      {groups.map((g) => {
        const items = rows.filter((h) => h.groupId === g.id);
        const isCollapsed = !!collapsed[g.id];
        return (
          <CollapsibleSection
            key={g.id}
            title={g.name}
            meta={items.length}
            collapsed={isCollapsed}
            onToggle={() => onToggle(g.id)}
            actions={
              <Button size="sm" variant="outline" onClick={() => onCreate(g.id)}>
                <Plus />
                {t("homework.add")}
              </Button>
            }
          >
            {items.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t("homework.sectionEmpty")}
              </p>
            ) : (
              <HomeworkTable
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
