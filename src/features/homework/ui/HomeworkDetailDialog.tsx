import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock3, PencilLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDateString, formatDateTime } from "@/lib/utils/format";
import { useTimeStore } from "@/lib/time-store";
import { SUBMISSION_STATUSES, type SubmissionStatus } from "@/features/homework/domain";
import {
  getHomeworkDetail,
  setAllSubmissionStatus,
  setSubmissionStatus,
} from "@/features/homework/application/homework-cases";
import type { HomeworkDetail } from "@/features/homework/application/homework-cases";
import { Modal } from "@/features/students/ui/Modal";

const STATUS_LABEL_KEY: Record<SubmissionStatus, string> = {
  submitted: "homework.statusSubmitted",
  pending: "homework.statusPending",
  late: "homework.statusLate",
};

const STATUS_BADGE: Record<SubmissionStatus, string> = {
  submitted: "border-emerald-600 bg-emerald-600/15 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  pending: "border-input text-muted-foreground",
  late: "border-amber-600 bg-amber-600/15 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
};

interface HomeworkDetailDialogProps {
  open: boolean;
  homeworkId: string | null;
  onClose: () => void;
  onChanged: () => void;
}

export function HomeworkDetailDialog({ open, homeworkId, onClose, onChanged }: HomeworkDetailDialogProps) {
  const { t } = useTranslation();
  const hour24 = useTimeStore((s) => s.hour24);
  const [detail, setDetail] = useState<HomeworkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!homeworkId) return;
    setLoading(true);
    setError("");
    getHomeworkDetail(homeworkId)
      .then(setDetail)
      .catch((e) => {
        console.error("Failed to load homework", e);
        setError(t("homework.loadError"));
      })
      .finally(() => setLoading(false));
  }, [homeworkId, t]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function handleStatus(studentId: string, status: SubmissionStatus) {
    if (!homeworkId || busy) return;
    setBusy(true);
    try {
      await setSubmissionStatus(homeworkId, studentId, status);
      onChanged();
      load();
    } catch (e) {
      console.error("Failed to set submission status", e);
      setError(t("homework.loadError"));
    } finally {
      setBusy(false);
    }
  }

  async function handleSetAll(status: SubmissionStatus) {
    if (!homeworkId || busy) return;
    setBusy(true);
    try {
      await setAllSubmissionStatus(homeworkId, status);
      onChanged();
      load();
    } catch (e) {
      console.error("Failed to set all submission statuses", e);
      setError(t("homework.loadError"));
    } finally {
      setBusy(false);
    }
  }

  const empty = !detail || (detail.students.length === 0);

  return (
    <Modal open={open} onClose={onClose} title={detail ? detail.title : t("homework.detail")} className="max-w-lg">
      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("students.loading")}</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : detail ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {detail.groupName && (
              <Badge variant="secondary">{detail.groupName}</Badge>
            )}
            {detail.dueDate && (
              <Badge variant="outline" dir="ltr">
                {formatDateString(detail.dueDate)}
              </Badge>
            )}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("homework.completion")}</span>
              <span className="font-medium" dir="ltr">{detail.completion}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all"
                style={{ width: `${detail.completion}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              <CheckCircle2 className="inline size-3.5 text-emerald-600" /> {detail.submitted}{" "}
              <Clock3 className="inline size-3.5 text-amber-600" /> {detail.late}{" "}
              <PencilLine className="inline size-3.5" /> {detail.pending}
            </p>
          </div>

          {detail.description && (
            <p className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 text-sm">
              {detail.description}
            </p>
          )}

          {!empty && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void handleSetAll("submitted")}
              >
                <CheckCircle2 />
                {t("homework.markAllSubmitted")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void handleSetAll("late")}
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
                        <div className="flex gap-1">
                          {SUBMISSION_STATUSES.map((s) => (
                            <button
                              key={s}
                              type="button"
                              aria-pressed={status === s}
                              onClick={() => void handleStatus(student.id, s)}
                              className={cn(
                                "rounded-md border px-2.5 py-1 text-xs transition-colors",
                                status === s
                                  ? STATUS_BADGE[s]
                                  : "border-input text-muted-foreground hover:bg-muted/50",
                              )}
                            >
                              {t(STATUS_LABEL_KEY[s])}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="ghost" onClick={onClose}>
              {t("homework.cancel")}
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
