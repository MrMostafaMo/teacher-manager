import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { CardSkeleton } from "@/shared/Skeletons";

export interface GroupMemberRow {
  id: string;
  name: string;
}

export function GroupMembersSection({
  members,
  available,
  loading,
  removingId,
  busy,
  onAdd,
  onRemove,
}: {
  members: GroupMemberRow[];
  available: GroupMemberRow[];
  loading: boolean;
  removingId: string | null;
  busy: boolean;
  onAdd: (studentId: string) => void;
  onRemove: (studentId: string) => void;
}) {
  const { t } = useTranslation();
  const [addingId, setAddingId] = useState("");

  function handleAdd() {
    if (!addingId || busy) return;
    onAdd(addingId);
    setAddingId("");
  }

  return (
    <>
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
                  onClick={() => onRemove(m.id)}
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
    </>
  );
}
