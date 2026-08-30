import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Save, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type StudentSkillInput } from "@/features/skills/domain";
import {
  getStudentSkills,
  saveStudentSkills,
  type StudentSkillRow,
} from "@/features/skills/application/skill-cases";
import { Modal } from "@/shared/Modal";
import { CardSkeleton } from "@/shared/Skeletons";
import { useSaveFeedback } from "@/shared/useSaveFeedback";
import { toast } from "@/lib/toast-store";
import { StudentSkillsTable, type SkillEdits } from "./StudentSkillsTable";

interface StudentSkillsDialogProps {
  open: boolean;
  studentId: string | null;
  studentName: string;
  onClose: () => void;
  onChanged: () => void;
}

export function StudentSkillsDialog({
  open,
  studentId,
  studentName,
  onClose,
  onChanged,
}: StudentSkillsDialogProps) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<StudentSkillRow[]>([]);
  const [edits, setEdits] = useState<SkillEdits>({});
  const [loading, setLoading] = useState(true);
  const { saving, saved, run, clear } = useSaveFeedback();
  const load = useCallback(() => {
    if (!studentId) return;
    setLoading(true);
    clear();
    getStudentSkills(studentId)
      .then((rows) => {
        setRows(rows);
        const next: SkillEdits = {};
        for (const r of rows) {
          next[r.skillId] = { level: r.level === null ? "" : String(r.level), note: r.note ?? "" };
        }
        setEdits(next);
      })
      .catch((e) => {
        console.error("Failed to load student skills", e);
        toast(t("skills.loadError"), "error");
      })
      .finally(() => setLoading(false));
  }, [studentId, t, clear]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  function setEdit(skillId: string, key: "level" | "note", value: string) {
    setEdits((cur) => ({ ...cur, [skillId]: { ...cur[skillId], [key]: value } }));
  }

  async function handleSave() {
    if (!studentId) return;
    try {
      await run(async () => {
        const inputs: StudentSkillInput[] = rows.map((r) => {
          const edit = edits[r.skillId];
          return { skillId: r.skillId, level: edit.level, note: edit.note };
        });
        await saveStudentSkills(studentId, inputs);
        onChanged();
        load();
        toast(t("skills.saved"));
      });
    } catch (e) {
      console.error("Failed to save student skills", e);
      toast(t("skills.saveError"), "error");
    }
  }

  const weakCount = rows.filter((r) => r.weak).length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("skills.studentSkills", { name: studentName })}
      className="max-w-lg"
    >
      {loading ? (
        <CardSkeleton lines={4} />
      ) : rows.length === 0 ? (
        <div className="space-y-4">
          <p className="py-8 text-center text-sm text-muted-foreground">{t("skills.noSkills")}</p>
          <div className="flex justify-end">
            <Button variant="ghost" onClick={onClose}>
              {t("skills.cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {weakCount > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
              <TriangleAlert className="size-3.5" />
              {t("skills.weakHint", { count: weakCount })}
            </p>
          )}

          <StudentSkillsTable rows={rows} edits={edits} onChange={setEdit} />

          <div className="flex items-center justify-end gap-2">
            {saved && <span className="text-sm text-success">{t("skills.saved")}</span>}
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              {t("skills.cancel")}
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              <Save />
              {saving ? t("skills.saving") : t("skills.save")}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
