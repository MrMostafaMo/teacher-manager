import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils/format";
import { useTimeStore } from "@/lib/time-store";
import type { SubmissionStatus } from "@/features/homework/domain";
import type { HomeworkDetail } from "@/features/homework/application/homework-cases";
import { SubmissionStatusPicker } from "./SubmissionStatusPicker";

export function HomeworkSubmissionsSection({
  detail,
  busy,
  onSetStatus,
  onSetAll,
}: {
  detail: HomeworkDetail;
  busy: boolean;
  onSetStatus: (studentId: string, status: SubmissionStatus) => void;
  onSetAll: (status: SubmissionStatus) => void;
}) {
  const { t } = useTranslation();
  const hour24 = useTimeStore((s) => s.hour24);
  const empty = detail.students.length === 0;

  return (
    <>
      {!empty && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => onSetAll("submitted")}
          >
            <CheckCircle2 />
            {t("homework.markAllSubmitted")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => onSetAll("late")}
          >
            <Clock3 />
            {t("homework.markAllLate")}
          </Button>
        </div>
      )}

      {empty ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("homework.noStudents")}</p>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <tbody>
              {detail.students.map(({ student, status, submittedAt }) => (
                <tr key={student.id} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <p className="font-medium">{student.name}</p>
                    {status === "pending" && detail.overdue ? (
                      <p className="text-xs text-destructive">{t("homework.notSubmitted")}</p>
                    ) : submittedAt ? (
                      <p className="text-xs text-muted-foreground" dir="ltr">
                        {t("homework.submittedAt")} {formatDateTime(submittedAt, hour24)}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <SubmissionStatusPicker
                      value={status}
                      disabled={busy}
                      onChange={(s) => onSetStatus(student.id, s)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
