import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock3, PencilLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateString } from "@/lib/utils/format";
import type { SubmissionStatus } from "@/features/homework/domain";
import {
  getHomeworkDetail,
  setAllSubmissionStatus,
  setSubmissionStatus,
} from "@/features/homework/application/homework-cases";
import type { HomeworkDetail } from "@/features/homework/application/homework-cases";
import { Modal } from "@/shared/Modal";
import { CardSkeleton } from "@/shared/Skeletons";
import { HomeworkSubmissionsSection } from "./homework-submissions-section";

interface HomeworkDetailDialogProps {
  open: boolean;
  homeworkId: string | null;
  onClose: () => void;
  onChanged: () => void;
}

export function HomeworkDetailDialog({ open, homeworkId, onClose, onChanged }: HomeworkDetailDialogProps) {
  const { t } = useTranslation();
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

  return (
    <Modal open={open} onClose={onClose} title={detail ? detail.title : t("homework.detail")} className="max-w-lg">
      {loading ? (
        <CardSkeleton lines={4} />
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
                className="h-full rounded-full bg-success transition-all"
                style={{ width: `${detail.completion}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              <CheckCircle2 className="inline size-3.5 text-success" /> {detail.submitted}{" "}
              <Clock3 className="inline size-3.5 text-warning" /> {detail.late}{" "}
              <PencilLine className="inline size-3.5" /> {detail.pending}
            </p>
          </div>

          {detail.description && (
            <p className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 text-sm">
              {detail.description}
            </p>
          )}

          <HomeworkSubmissionsSection
            detail={detail}
            busy={busy}
            onSetStatus={(studentId, s) => void handleStatus(studentId, s)}
            onSetAll={(s) => void handleSetAll(s)}
          />

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
