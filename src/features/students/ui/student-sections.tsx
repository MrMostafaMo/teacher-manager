import { useTranslation } from "react-i18next";
import { CollapsibleSection } from "@/shared/CollapsibleSection";
import type { Section } from "@/lib/build-grouped-sections";
import type { Student } from "@/lib/db/schema";
import { StudentsTable } from "./StudentsTable";

interface StudentsSectionsProps {
  sections: Section<Student>[];
  ungrouped: Student[];
  deletingId: string | null;
  isCollapsed: (id: string) => boolean;
  onToggle: (id: string) => void;
  onOpen: (student: Student) => void;
  onDelete: (student: Student) => void;
  selectedIds: Set<string>;
  onToggleSelection: (id: string, checked: boolean) => void;
  onToggleAllSelection: (list: Student[], checked: boolean) => void;
}

export function StudentsSections({
  sections,
  ungrouped,
  deletingId,
  isCollapsed,
  onToggle,
  onOpen,
  onDelete,
  selectedIds,
  onToggleSelection,
  onToggleAllSelection,
}: StudentsSectionsProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      {sections.map((sec) => {
        const collapsed = isCollapsed(sec.id);
        return (
          <CollapsibleSection
            key={sec.id}
            title={sec.name}
            meta={`${sec.list.length}`}
            collapsed={collapsed}
            onToggle={() => onToggle(sec.id)}
          >
            <StudentsTable
              list={sec.list}
              deletingId={deletingId}
              selectedIds={selectedIds}
              onOpen={onOpen}
              onDelete={onDelete}
              onToggle={onToggleSelection}
              onToggleAll={(checked) => onToggleAllSelection(sec.list, checked)}
            />
          </CollapsibleSection>
        );
      })}
      {ungrouped.length > 0 && (
        <CollapsibleSection
          key="__ungrouped"
          title={t("students.ungrouped")}
          meta={`${ungrouped.length}`}
          collapsed={isCollapsed("__ungrouped")}
          onToggle={() => onToggle("__ungrouped")}
        >
          <StudentsTable
            list={ungrouped}
            deletingId={deletingId}
            selectedIds={selectedIds}
            onOpen={onOpen}
            onDelete={onDelete}
            onToggle={onToggleSelection}
            onToggleAll={(checked) => onToggleAllSelection(ungrouped, checked)}
          />
        </CollapsibleSection>
      )}
    </div>
  );
}
