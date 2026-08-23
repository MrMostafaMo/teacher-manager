import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ExamDetail } from "@/features/exams/application/exam-cases";

export type ExamEdits = Record<string, { score: string; note: string }>;

interface ExamResultsTableProps {
  students: ExamDetail["students"];
  edits: ExamEdits;
  maxScore: number;
  onChange: (studentId: string, key: "score" | "note", value: string) => void;
}

export function ExamResultsTable({ students, edits, maxScore, onChange }: ExamResultsTableProps) {
  const { t } = useTranslation();
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <tbody>
          {students.map(({ student, score }) => {
            const edit = edits[student.id];
            const dirty = edit.score !== (score === null ? "" : String(score));
            const numScore = Number(edit.score);
            const outOfRange = edit.score !== "" && (Number.isNaN(numScore) || numScore < 0 || numScore > maxScore);
            return (
              <tr key={student.id} className="border-b last:border-0">
                <td className="px-3 py-2 font-medium">{student.name}</td>
                <td className="w-20 px-2 py-2">
                  <Input
                    type="number"
                    min={0}
                    max={maxScore}
                    dir="ltr"
                    placeholder="—"
                    aria-label={t("exams.scoreFor", { name: student.name })}
                    aria-invalid={outOfRange || undefined}
                    className={cn("h-8 text-center", dirty && "border-success", outOfRange && "border-destructive focus-visible:ring-destructive/50")}
                    value={edit.score}
                    onChange={(e) => onChange(student.id, "score", e.target.value)}
                  />
                  {outOfRange && (
                    <p className="mt-1 text-[10px] leading-none text-destructive">
                      {t("exams.scoreOutOfRange", { max: maxScore })}
                    </p>
                  )}
                </td>
                <td className="w-32 px-2 py-2">
                  <Input
                    dir="ltr"
                    placeholder={t("exams.notePlaceholder")}
                    aria-label={t("exams.noteFor", { name: student.name })}
                    className="h-8"
                    value={edit.note}
                    onChange={(e) => onChange(student.id, "note", e.target.value)}
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
