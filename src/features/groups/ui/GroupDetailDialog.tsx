import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  addStudentToGroup,
  getGroupDetail,
  removeStudentFromGroup,
} from "@/features/groups/application/group-cases";
import { listSchedule } from "@/features/schedule/application/schedule-cases";
import type { GroupDetail } from "@/features/groups/application/group-cases";
import type { GroupSession, StudyGroup } from "@/lib/db/schema";
import { Modal } from "@/shared/Modal";
import { StatusBadge } from "@/features/students/ui/StatusBadge";
import { formatTime, formatDateString } from "@/lib/utils/format";
import { useTimeStore } from "@/lib/time-store";
import { useConfirmDelete } from "@/shared/useConfirmDelete";
import { GroupMembersSection } from "./group-members-section";

const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

interface GroupDetailDialogProps {
  group: StudyGroup;
  onClose: () => void;
  onEdit: () => void;
  onChanged: () => void;
}

export function GroupDetailDialog({ group, onClose, onEdit, onChanged }: GroupDetailDialogProps) {
  const { t } = useTranslation();
  const hour24 = useTimeStore((s) => s.hour24);
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { armed: removingId, request } = useConfirmDelete();
  const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState<GroupSession[]>([]);

  useEffect(() => {
    void listSchedule()
      .then((all) => setSessions(all.filter((s) => s.groupId === group.id)))
      .catch(() => setSessions([]));
  }, [group.id]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setDetail(await getGroupDetail(group.id));
    } catch {
      setError(t("groups.loadError"));
    } finally {
      setLoading(false);
    }
  }, [group.id, t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleAdd(studentId: string) {
    if (busy) return;
    setBusy(true);
    try {
      await addStudentToGroup(studentId, group.id);
      await reload();
      onChanged();
    } catch {
      setError(t("groups.memberError"));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(studentId: string) {
    if (!request(studentId)) return;
    if (busy) return;
    setBusy(true);
    try {
      await removeStudentFromGroup(studentId, group.id);
      await reload();
      onChanged();
    } catch {
      setError(t("groups.memberError"));
    } finally {
      setBusy(false);
    }
  }

  const members = detail?.members ?? [];
  const available = detail?.available ?? [];

  return (
    <Modal
      open
      onClose={onClose}
      title={group.name}
      description={
        <>
          {group.subject ? `${group.subject} · ` : ""}
          {group.startsOn ? `${t("groups.fields.startsOn")}: ${formatDateString(group.startsOn)} · ` : ""}
          {sessions.length > 0
            ? sessions
                .map(
                  (s) =>
                    `${t(`schedule.days.${DAY_NAMES[s.dayOfWeek]}`)} ${formatTime(s.startTime, hour24)}–${formatTime(s.endTime, hour24)}`,
                )
                .join(" · ")
            : (group.schedule ?? t("groups.noSchedule"))}
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex justify-end">
          <StatusBadge status={group.status} />
        </div>

        {group.notes && (
          <>
            <Separator />
            <p className="text-sm whitespace-pre-wrap">{group.notes}</p>
          </>
        )}

        <Separator />

        <GroupMembersSection
          members={members}
          available={available}
          loading={loading}
          removingId={removingId}
          busy={busy}
          onAdd={(id) => void handleAdd(id)}
          onRemove={(id) => void handleRemove(id)}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onEdit}>
            <Pencil />
            {t("groups.edit")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
