import { useTranslation } from "react-i18next";
import { CollapsibleSection } from "@/shared/CollapsibleSection";
import type { Section } from "@/lib/build-grouped-sections";
import type { Student } from "@/lib/db/schema";
import { StudentsTable } from "./StudentsTable";

interface StudentsSectionsProps {
  sections: Section<Student>[];
  ungrouped: Student[];
  deletingId: string | null;
  collapsed: Record<string, boolean>;
  onToggle: (id: string) => void;
  onOpen: (student: Student) => void;
  onDelete: (student: Student) => void;
}

export function StudentsSections({
  sections,
  ungrouped,
  deletingId,
  collapsed,
  onToggle,
  onOpen,
  onDelete,
}: StudentsSectionsProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      {sections.map((sec) => {
        const isCollapsed = !!collapsed[sec.id];
        return (
          <CollapsibleSection
            key={sec.id}
            title={sec.name}
            meta={`${sec.list.length}`}
            collapsed={isCollapsed}
            onToggle={() => onToggle(sec.id)}
          >
            <StudentsTable
              list={sec.list}
              deletingId={deletingId}
              onOpen={onOpen}
              onDelete={onDelete}
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
          onToggle={() => onToggle("__ungrouped")}
        >
          <StudentsTable
            list={ungrouped}
            deletingId={deletingId}
            onOpen={onOpen}
            onDelete={onDelete}
          />
        </CollapsibleSection>
      )}
    </div>
  );
}
