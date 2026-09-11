import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  countPaymentHistory,
  deletePayment,
  listPaymentHistory,
  type PaymentHistoryRow,
} from "@/features/payments/application/payment-cases";
import { listMemberships } from "@/features/groups/application/group-cases";
import { studentRepository } from "@/features/students/infrastructure/student-repo";
import type { Payment, Student } from "@/lib/db/schema";
import { TableRowsSkeleton } from "@/shared/Skeletons";
import { EmptyState } from "@/shared/EmptyState";
import { useConfirmDelete } from "@/shared/useConfirmDelete";
import { useCollapsedSections } from "@/shared/useCollapsedSections";
import { notifyUndo } from "@/lib/undo-store";
import { groupPaymentHistory } from "./history-grouping";
import { HistorySections } from "./history-sections";
import { HistoryTable } from "./history-table";
import { usePaymentReceipt } from "./use-payment-receipt";
import { toast } from "@/lib/toast-store";

/** Above this many rows the grouped view gives way to a flat paged table. */
const GROUPED_LIMIT = 500;
const PAGE_SIZE = 50;

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
  const [students, setStudents] = useState<Array<Pick<Student, "id" | "name">>>([]);
  const [groupsByStudent, setGroupsByStudent] = useState<
    Map<string, Array<{ id: string; name: string }>>
  >(new Map());
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const paged = total > GROUPED_LIMIT;
  const { armed: deletingId, request, clear } = useConfirmDelete();
  const { isCollapsed, toggle } = useCollapsedSections();
  const { busyId: receiptBusyId, run: runReceipt } = usePaymentReceipt();

  useEffect(() => {
    void studentRepository
      .searchNames({ status: "all" })
      .then((r) => setStudents(r.map((s) => ({ id: s.id, name: s.name }))))
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
    setPage(0);
  }, [studentId, reloadKey]);

  useEffect(() => {
    setLoading(true);
    const id = studentId || undefined;
    countPaymentHistory({ studentId: id })
      .then((count) => {
        setTotal(count);
        // Small histories stay grouped; large ones page server-side (flat).
        const opts =
          count > GROUPED_LIMIT
            ? { studentId: id, limit: PAGE_SIZE, offset: page * PAGE_SIZE }
            : { studentId: id };
        return listPaymentHistory(opts);
      })
      .then(setRows)
      .catch((e) => {
        console.error("Failed to load payment history", e);
        toast(t("payments.loadError"), "error");
        setRows([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [studentId, reloadKey, page, t]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!request(id)) return;
      try {
        const row = rows.find((p) => p.payment.id === id);
        const undoId = await deletePayment(id);
        setRows((r) => r.filter((p) => p.payment.id !== id));
        if (paged) setTotal((n) => Math.max(0, n - 1));
        onChanged();
        if (undoId !== null && row) {
          notifyUndo(
            undoId,
            t("undo.deleted"),
            `${t("undo.payment")}: ${row.studentName}`,
            t("undo.undo"),
          );
        }
      } catch (e) {
        console.error("Failed to delete payment", e);
        toast(t("payments.deleteError"), "error");
      } finally {
        clear();
      }
    },
    [request, clear, onChanged, rows, paged, t],
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

      {loading && rows.length === 0 ? (
        <TableRowsSkeleton rows={5} cols={5} />
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState icon={History} title={t("payments.emptyHistory")} />
          </CardContent>
        </Card>
      ) : paged ? (
        <Card>
          <CardContent className="p-0">
            <HistoryTable
              list={rows}
              deletingId={deletingId}
              receiptBusyId={receiptBusyId}
              onEdit={onEdit}
              onDelete={handleDelete}
              onReceipt={(row) => void runReceipt(row)}
              pager={{ page, total, pageSize: PAGE_SIZE, onPageChange: setPage }}
            />
          </CardContent>
        </Card>
      ) : (
        <HistorySections
          sections={sections}
          ungrouped={ungrouped}
          isCollapsed={isCollapsed}
          onToggle={toggle}
          deletingId={deletingId}
          receiptBusyId={receiptBusyId}
          onEdit={onEdit}
          onDelete={handleDelete}
          onReceipt={(row) => void runReceipt(row)}
        />
      )}
    </div>
  );
});
