import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select } from "@/components/ui/select";
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
import { CardSkeleton } from "@/shared/Skeletons";
import { formatTime, formatDateString } from "@/lib/utils/format";
import { useTimeStore } from "@/lib/time-store";

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
  const [addingId, setAddingId] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
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

  async function handleAdd() {
    if (!addingId || busy) return;
    setBusy(true);
    try {
      await addStudentToGroup(addingId, group.id);
      setAddingId("");
      await reload();
      onChanged();
    } catch {
      setError(t("groups.memberError"));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(studentId: string) {
    if (removingId !== studentId) {
      setRemovingId(studentId);
      setTimeout(() => setRemovingId((cur) => (cur === studentId ? null : cur)), 2500);
      return;
    }
    if (busy) return;
    setRemovingId(null);
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

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t("groups.members")} ({members.length})
          </p>
          {loading ? (
            <CardSkeleton lines={2} />
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("groups.noMembers")}</p>
          ) : (
            <ul className="space-y-1">
              {members.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-2.5 py-1.5 text-sm">
                  <span className="truncate">{m.name}</span>
                  <Button
                    variant={removingId === m.id ? "destructive" : "ghost"}
                    size="icon-sm"
                    aria-label={
                      removingId === m.id ? t("groups.confirmDelete") : t("groups.removeMember")
                    }
                    onClick={() => void handleRemove(m.id)}
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {available.length > 0 && (
          <div className="flex items-center gap-2">
            <Select
              value={addingId}
              onChange={(e) => setAddingId(e.target.value)}
              aria-label={t("groups.addMember")}
              className="flex-1"
            >
              <option value="">{t("groups.addMemberHint")}</option>
              {available.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Button size="sm" onClick={() => void handleAdd()} disabled={!addingId || busy}>
              <UserPlus />
              {t("groups.addMember")}
            </Button>
          </div>
        )}

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
