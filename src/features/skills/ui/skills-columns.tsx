import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { PencilLine, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type DataTableColumn } from "@/shared/DataTable";
import { cn } from "@/lib/utils";
import type { SkillWithWeakCount } from "@/features/skills/infrastructure/skill-repo";
import type { Skill } from "@/lib/db/schema";

export function useSkillsColumns(
  deletingId: string | null,
  onEdit: (skill: Skill) => void,
  onDelete: (id: string) => void,
) {
  const { t } = useTranslation();
  return useMemo<DataTableColumn<SkillWithWeakCount>[]>(
    () => [
      {
        header: t("skills.columns.name"),
        className: "font-medium",
        render: (s) => s.name,
      },
      {
        header: t("skills.columns.tracked"),
        className: "text-muted-foreground tabular-nums",
        render: (s) => <span dir="ltr">{s.trackedCount}</span>,
      },
      {
        header: t("skills.columns.weak"),
        render: (s) =>
          s.weakCount > 0 ? (
            <Badge className={cn("border-warning bg-warning/15 text-warning")}>
              {t("skills.weakCount", { count: s.weakCount })}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        header: "",
        className: "text-end",
        headerClassName: "text-end",
        render: (s) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => onEdit(s)}>
              <PencilLine />
              <span className="sr-only">{t("skills.edit")}</span>
            </Button>
            <Button
              variant={deletingId === s.id ? "destructive" : "ghost"}
              size="icon-sm"
              aria-label={deletingId === s.id ? t("skills.confirmDelete") : t("skills.delete")}
              onClick={() => onDelete(s.id)}
            >
              <Trash2 />
            </Button>
          </div>
        ),
      },
    ],
    [t, deletingId, onEdit, onDelete],
  );
}
