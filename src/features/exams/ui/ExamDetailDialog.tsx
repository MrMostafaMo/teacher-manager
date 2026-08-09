import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatDateString } from "@/lib/utils/format";
import {
  getExamDetail,
  saveExamResults,
  type ExamDetail,
} from "@/features/exams/application/exam-cases";
import type { ExamResultInput } from "@/features/exams/domain";
import { Modal } from "@/shared/Modal";
import { CardSkeleton } from "@/shared/Skeletons";
import { useSaveFeedback } from "@/shared/useSaveFeedback";
import { toast } from "@/lib/toast-store";

interface ExamDetailDialogProps {
  open: boolean;
  examId: string | null;
  onClose: () => void;
  onChanged: () => void;
}

type Edits = Record<string, { score: string; note: string }>;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-2.5 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold" dir="ltr">
        {value}
      </p>
    </div>
  );
}

export function ExamDetailDialog({ open, examId, onClose, onChanged }: ExamDetailDialogProps) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<ExamDetail | null>(null);
  const [edits, setEdits] = useState<Edits>({});
  const [loading, setLoading] = useState(true);
  const { saving, saved, run, clear } = useSaveFeedback();
  const [error, setError] = useState("");

  const load = useCallback(() => {
    if (!examId) return;
    setLoading(true);
    setError("");
    clear();
    getExamDetail(examId)
      .then((d) => {
        setDetail(d);
        const next: Edits = {};
        for (const s of d.students) {
          next[s.student.id] = { score: s.score === null ? "" : String(s.score), note: s.note ?? "" };
        }
        setEdits(next);
      })
      .catch((e) => {
        console.error("Failed to load exam", e);
        setError(t("exams.loadError"));
      })
      .finally(() => setLoading(false));
  }, [examId, t, clear]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  function setEdit(studentId: string, key: "score" | "note", value: string) {
    setEdits((cur) => ({ ...cur, [studentId]: { ...cur[studentId], [key]: value } }));
  }

  async function handleSave() {
    if (!detail) return;
    try {
      await run(async () => {
        const inputs: ExamResultInput[] = detail.students.map(({ student }) => {
          const edit = edits[student.id];
          return { studentId: student.id, score: edit.score, note: edit.note };
        });
        await saveExamResults(detail.id, inputs);
        onChanged();
        load();
        toast(t("exams.saved"));
      });
    } catch (e) {
      console.error("Failed to save exam results", e);
      setError(t("exams.saveError"));
    }
  }

  const empty = !detail || detail.students.length === 0;

  return (
    <Modal open={open} onClose={onClose} title={detail ? detail.title : t("exams.detail")} className="max-w-lg">
      {loading ? (
        <CardSkeleton lines={4} />
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : detail ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {detail.groupName && (
              <span className="text-muted-foreground">{detail.groupName}</span>
            )}
            <span className="text-muted-foreground" dir="ltr">
              {detail.maxScore} {t("exams.maxShort")}
            </span>
            {detail.date && (
              <span className="text-muted-foreground" dir="ltr">
                {formatDateString(detail.date)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label={t("exams.stats.average")} value={detail.average === null ? "—" : String(detail.average)} />
            <Stat label={t("exams.stats.highest")} value={detail.highest === null ? "—" : String(detail.highest)} />
            <Stat label={t("exams.stats.lowest")} value={detail.lowest === null ? "—" : String(detail.lowest)} />
            <Stat
              label={t("exams.stats.passRate")}
              value={detail.passRate === null ? "—" : `${detail.passRate}%`}
            />
          </div>

          {empty ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("exams.noStudents")}</p>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <tbody>
                  {detail.students.map(({ student, score }) => {
                    const edit = edits[student.id];
                    const dirty = edit.score !== (score === null ? "" : String(score));
                    return (
                      <tr key={student.id} className="border-b last:border-0">
                        <td className="px-3 py-2 font-medium">{student.name}</td>
                        <td className="w-20 px-2 py-2">
                          <Input
                            type="number"
                            min={0}
                            max={detail.maxScore}
                            dir="ltr"
                            placeholder="—"
                            aria-label={t("exams.scoreFor", { name: student.name })}
                            className={cn("h-8 text-center", dirty && "border-success")}
                            value={edit.score}
                            onChange={(e) => setEdit(student.id, "score", e.target.value)}
                          />
                        </td>
                        <td className="w-32 px-2 py-2">
                          <Input
                            dir="ltr"
                            placeholder={t("exams.notePlaceholder")}
                            aria-label={t("exams.noteFor", { name: student.name })}
                            className="h-8"
                            value={edit.note}
                            onChange={(e) => setEdit(student.id, "note", e.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            {saved && <span className="text-sm text-success">{t("exams.saved")}</span>}
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              {t("exams.cancel")}
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving || empty}>
              <Save />
              {saving ? t("exams.saving") : t("exams.saveResults")}
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
