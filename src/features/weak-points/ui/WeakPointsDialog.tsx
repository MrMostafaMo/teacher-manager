import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/shared/Modal";
import { CardSkeleton } from "@/shared/Skeletons";
import { useConfirmDelete } from "@/shared/useConfirmDelete";
import { toast } from "@/lib/toast-store";
import { notifyUndo } from "@/lib/undo-store";
import type { WeakPointInput } from "@/features/weak-points/domain";
import {
  addWeakPoint,
  listStudentWeakPoints,
  removeWeakPoint,
  updateWeakPoint,
  type StudentWeakPoint,
} from "@/features/weak-points/application/weak-point-cases";
import { WeakPointsTable } from "./weak-points-table";
import {
  emptyWeakPointForm,
  weakPointFormFromRow,
  WeakPointForm,
  type WeakPointFormState,
} from "./weak-point-form";

interface WeakPointsDialogProps {
  open: boolean;
  studentId: string | null;
  onClose: () => void;
  onChanged: () => void;
}

export function WeakPointsDialog({ open, studentId, onClose, onChanged }: WeakPointsDialogProps) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<StudentWeakPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<StudentWeakPoint | null>(null);
  const [formState, setFormState] = useState<WeakPointFormState>(emptyWeakPointForm());
  const { armed, request, clear } = useConfirmDelete();

  const load = useCallback(() => {
    if (!studentId) return;
    setLoading(true);
    setLoadError("");
    listStudentWeakPoints(studentId)
      .then(setRows)
      .catch((e) => {
        console.error("Failed to load weak points", e);
        setLoadError(t("weakPoints.loadError"));
      })
      .finally(() => setLoading(false));
  }, [studentId, t]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    setFormState(editing ? weakPointFormFromRow(editing) : emptyWeakPointForm());
  }, [editing]);

  async function handleSave(input: WeakPointInput) {
    if (!studentId) return;
    setSaving(true);
    try {
      if (editing) {
        await updateWeakPoint(editing.id, { ...input, resolved: editing.resolved });
      } else await addWeakPoint(studentId, input);
      setEditing(null);
      toast(t("weakPoints.saved"));
      onChanged();
      load();
    } finally {
      setSaving(false);
    }
  }

  function handleToggleResolved(row: StudentWeakPoint) {
    void updateWeakPoint(row.id, {
      description: row.description,
      recordedOn: row.recordedOn,
      resolved: !row.resolved,
    })
      .then(() => {
        onChanged();
        load();
      })
      .catch(() => toast(t("weakPoints.saveError"), "error"));
  }

  function handleDelete(id: string) {
    const row = rows.find((r) => r.id === id);
    void removeWeakPoint(id)
      .then((undoId) => {
        if (undoId !== null && row) {
          notifyUndo(
            undoId,
            t("undo.deleted"),
            `${t("undo.weakPoint")}: ${row.description}`,
            t("undo.undo"),
          );
        }
        onChanged();
        load();
      })
      .catch(() => toast(t("weakPoints.deleteError"), "error"));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("profile.sections.weakPoints")}
      className="max-w-lg"
    >
      {loading ? (
        <CardSkeleton lines={4} />
      ) : loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : (
        <div className="space-y-4">
          <WeakPointForm
            initial={formState}
            onSave={handleSave}
            saving={saving}
            onClose={onClose}
          />
          <WeakPointsTable
            rows={rows}
            deletingId={armed}
            onEdit={(row) => {
              clear();
              setEditing(row);
            }}
            onToggleResolved={handleToggleResolved}
            onDelete={(id) => {
              if (request(id)) handleDelete(id);
            }}
          />
        </div>
      )}
    </Modal>
  );
}
