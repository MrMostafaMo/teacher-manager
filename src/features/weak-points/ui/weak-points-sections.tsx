import { useTranslation } from "react-i18next";
import { CollapsibleSection } from "@/shared/CollapsibleSection";
import type { Section } from "@/lib/build-grouped-sections";
import type { StudentWeakPoint } from "@/features/weak-points/application/weak-point-cases";
import { WeakPointsTable } from "./weak-points-table";

export function WeakPointsSections({
  sections,
  ungrouped,
  names,
  deletingId,
  isCollapsed,
  onToggle,
  onOpenProfile,
  onEdit,
  onToggleResolved,
  onDelete,
}: {
  sections: Section<StudentWeakPoint>[];
  ungrouped: StudentWeakPoint[];
  names: Map<string, string>;
  deletingId: string | null;
  isCollapsed: (id: string) => boolean;
  onToggle: (id: string) => void;
  onOpenProfile: (studentId: string) => void;
  onEdit: (row: StudentWeakPoint) => void;
  onToggleResolved: (row: StudentWeakPoint) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();

  function renderTable(list: StudentWeakPoint[]) {
    return (
      <WeakPointsTable
        rows={list}
        deletingId={deletingId}
        renderStudent={(r) => {
          const name = names.get(r.studentId) ?? "—";
          return (
            <button
              type="button"
              onClick={() => onOpenProfile(r.studentId)}
              aria-label={t("weakPoints.openProfile", { name })}
              className="flex items-center gap-2 text-start text-primary hover:underline"
            >
              {name}
            </button>
          );
        }}
        onEdit={onEdit}
        onToggleResolved={onToggleResolved}
        onDelete={onDelete}
      />
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((sec) => (
        <CollapsibleSection
          key={sec.id}
          title={sec.name}
          meta={sec.list.length}
          collapsed={isCollapsed(sec.id)}
          onToggle={() => onToggle(sec.id)}
        >
          {renderTable(sec.list)}
        </CollapsibleSection>
      ))}
      {ungrouped.length > 0 && (
        <CollapsibleSection
          key="__ungrouped"
          title={t("weakPoints.ungrouped")}
          meta={ungrouped.length}
          collapsed={isCollapsed("__ungrouped")}
          onToggle={() => onToggle("__ungrouped")}
        >
          {renderTable(ungrouped)}
        </CollapsibleSection>
      )}
    </div>
  );
}