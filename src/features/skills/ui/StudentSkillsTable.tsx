import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SKILL_LEVELS } from "@/features/skills/domain";
import type { StudentSkillRow } from "@/features/skills/application/skill-cases";

export type SkillEdits = Record<string, { level: string; note: string }>;

interface StudentSkillsTableProps {
  rows: StudentSkillRow[];
  edits: SkillEdits;
  onChange: (skillId: string, key: "level" | "note", value: string) => void;
}

export function StudentSkillsTable({ rows, edits, onChange }: StudentSkillsTableProps) {
  const { t } = useTranslation();
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => {
            const edit = edits[r.skillId];
            const dirty = edit.level !== (r.level === null ? "" : String(r.level));
            return (
              <tr key={r.skillId} className="border-b last:border-0">
                <td
                  className={cn(
                    "px-3 py-2 font-medium",
                    r.weak && "text-amber-700 dark:text-amber-400",
                  )}
                >
                  {r.name}
                </td>
                <td className="w-28 px-2 py-2">
                  <Select
                    value={edit.level}
                    onChange={(e) => onChange(r.skillId, "level", e.target.value)}
                    aria-label={t("skills.levelFor", { name: r.name })}
                    className={cn("text-center", dirty && "border-success bg-success/10 ring-1 ring-success/30")}
                  >
                    <option value="">—</option>
                    {SKILL_LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="w-32 px-2 py-2">
                  <Input
                    dir="ltr"
                    placeholder={t("skills.notePlaceholder")}
                    aria-label={t("skills.noteFor", { name: r.name })}
                    className="h-8"
                    value={edit.note}
                    onChange={(e) => onChange(r.skillId, "note", e.target.value)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
