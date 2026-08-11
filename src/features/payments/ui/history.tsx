import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  deletePayment,
  listPaymentHistory,
  type PaymentHistoryRow,
} from "@/features/payments/application/payment-cases";
import { listMemberships } from "@/features/groups/application/group-cases";
import { listStudents } from "@/features/students/application/student-cases";
import type { Payment, Student } from "@/lib/db/schema";
import { TableRowsSkeleton } from "@/shared/Skeletons";
import { EmptyState } from "@/shared/EmptyState";
import { useConfirmDelete } from "@/shared/useConfirmDelete";
import { groupPaymentHistory } from "./history-grouping";
import { HistorySections } from "./history-sections";

export const HistoryView = memo(function HistoryView({
  reloadKey,
  onChanged,
  onEdit,
}: {
  reloadKey: number;
  onChanged: () => void;
  onEdit: (payment: Payment) => void;
}) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<PaymentHistoryRow[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [groupsByStudent, setGroupsByStudent] = useState<
    Map<string, Array<{ id: string; name: string }>>
  >(new Map());
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { armed: deletingId, request, clear } = useConfirmDelete();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void listStudents()
      .then(setStudents)
      .catch(() => setStudents([]));
  }, []);

  useEffect(() => {
    listMemberships()
      .then((m) => {
        const map = new Map<string, Array<{ id: string; name: string }>>();
        for (const x of m) {
          const arr = map.get(x.studentId) ?? [];
          arr.push({ id: x.groupId, name: x.groupName });
          map.set(x.studentId, arr);
        }
        setGroupsByStudent(map);
      })
      .catch(() => setGroupsByStudent(new Map()));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    listPaymentHistory({ studentId: studentId || undefined })
      .then(setRows)
      .catch((e) => {
        console.error("Failed to load payment history", e);
        setError(t("payments.loadError"));
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [studentId, reloadKey, t]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!request(id)) return;
      try {
        await deletePayment(id);
        setRows((r) => r.filter((p) => p.payment.id !== id));
        onChanged();
      } catch (e) {
        console.error("Failed to delete payment", e);
        setError(t("payments.deleteError"));
      } finally {
        clear();
      }
    },
    [request, clear, onChanged, t],
  );

  const { sections, ungrouped } = useMemo(
    () => groupPaymentHistory(rows, groupsByStudent),
    [rows, groupsByStudent],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          aria-label={t("payments.student")}
          className="w-auto shrink-0"
        >
          <option value="">{t("payments.allStudents")}</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <TableRowsSkeleton rows={5} cols={5} />
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState icon={History} title={t("payments.emptyHistory")} />
          </CardContent>
        </Card>
      ) : (
        <HistorySections
          sections={sections}
          ungrouped={ungrouped}
          collapsed={collapsed}
          onToggle={(id) => setCollapsed((c) => ({ ...c, [id]: !c[id] }))}
          deletingId={deletingId}
          onEdit={onEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
});
