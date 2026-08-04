import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Save, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SKILL_LEVELS, type StudentSkillInput } from "@/features/skills/domain";
import {
  getStudentSkills,
  saveStudentSkills,
  type StudentSkillRow,
} from "@/features/skills/application/skill-cases";
import { Modal } from "@/features/students/ui/Modal";

interface StudentSkillsDialogProps {
  open: boolean;
  studentId: string | null;
  studentName: string;
  onClose: () => void;
  onChanged: () => void;
}

type Edits = Record<string, { level: string; note: string }>;

export function StudentSkillsDialog({
  open,
  studentId,
  studentName,
  onClose,
  onChanged,
}: StudentSkillsDialogProps) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<StudentSkillRow[]>([]);
  const [edits, setEdits] = useState<Edits>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    if (!studentId) return;
    setLoading(true);
    setError("");
    setSaved(false);
    getStudentSkills(studentId)
      .then((rows) => {
        setRows(rows);
        const next: Edits = {};
        for (const r of rows) {
          next[r.skillId] = { level: r.level === null ? "" : String(r.level), note: r.note ?? "" };
        }
        setEdits(next);
      })
      .catch((e) => {
        console.error("Failed to load student skills", e);
        setError(t("skills.loadError"));
      })
      .finally(() => setLoading(false));
  }, [studentId, t]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  function setEdit(skillId: string, key: "level" | "note", value: string) {
    setEdits((cur) => ({ ...cur, [skillId]: { ...cur[skillId], [key]: value } }));
  }

  async function handleSave() {
    if (!studentId || saving) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const inputs: StudentSkillInput[] = rows.map((r) => {
        const edit = edits[r.skillId];
        return { skillId: r.skillId, level: edit.level, note: edit.note };
      });
      await saveStudentSkills(studentId, inputs);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onChanged();
      load();
    } catch (e) {
      console.error("Failed to save student skills", e);
      setError(t("skills.saveError"));
    } finally {
      setSaving(false);
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
        <p className="py-10 text-center text-sm text-muted-foreground">{t("students.loading")}</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
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
                        <select
                          value={edit.level}
                          onChange={(e) => setEdit(r.skillId, "level", e.target.value)}
                          aria-label={t("skills.levelFor", { name: r.name })}
                          className={cn(
                            "h-8 w-full rounded-lg border border-input bg-transparent px-1.5 text-center text-sm outline-none focus-visible:border-ring",
                            dirty && "border-emerald-600",
                          )}
                        >
                          <option value="">—</option>
                          {SKILL_LEVELS.map((l) => (
                            <option key={l} value={l}>
                              {l}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="w-32 px-2 py-2">
                        <Input
                          dir="ltr"
                          placeholder={t("skills.notePlaceholder")}
                          aria-label={t("skills.noteFor", { name: r.name })}
                          className="h-8"
                          value={edit.note}
                          onChange={(e) => setEdit(r.skillId, "note", e.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-2">
            {saved && <span className="text-sm text-emerald-600">{t("skills.saved")}</span>}
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
