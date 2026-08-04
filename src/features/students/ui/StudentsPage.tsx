import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  deleteStudent,
  listStudents,
} from "@/features/students/application/student-cases";
import type { Student } from "@/lib/db/schema";
import { StudentDetailDialog } from "./StudentDetailDialog";
import { StudentFormDialog } from "./StudentFormDialog";
import { StatusBadge } from "./StatusBadge";

type StatusFilter = "all" | "active" | "inactive";

export default function StudentsPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listStudents({ query, status }));
    } catch (error) {
      console.error("Failed to load students", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [query, status]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const detail = detailId ? rows.find((s) => s.id === detailId) : undefined;

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(student: Student) {
    setDetailId(null);
    setEditing(student);
    setFormOpen(true);
  }

  async function handleRowDelete(student: Student) {
    if (deletingId !== student.id) {
      setDeletingId(student.id);
      setTimeout(() => setDeletingId((cur) => (cur === student.id ? null : cur)), 2500);
      return;
    }
    try {
      await deleteStudent(student.id);
      void reload();
    } catch (error) {
      console.error("Failed to delete student", error);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">{t("nav.students")}</h2>
          <p className="text-sm text-muted-foreground">{t("students.subtitle")}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus />
          {t("students.add")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("students.searchPlaceholder")}
            className="ps-8"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring"
        >
          <option value="all">{t("students.filterAll")}</option>
          <option value="active">{t("students.statusActive")}</option>
          <option value="inactive">{t("students.statusInactive")}</option>
        </select>
        <Badge variant="secondary">
          <Users className="size-3.5" />
          {rows.length}
        </Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              {t("students.loading")}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState hasFilters={query.trim() !== "" || status !== "all"} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-start font-medium">
                      {t("students.columns.name")}
                    </th>
                    <th className="px-4 py-2.5 text-start font-medium">
                      {t("students.columns.guardian")}
                    </th>
                    <th className="px-4 py-2.5 text-start font-medium">
                      {t("students.columns.phone")}
                    </th>
                    <th className="px-4 py-2.5 text-start font-medium">
                      {t("students.columns.status")}
                    </th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-2.5 font-medium">{s.name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{s.guardianName ?? "—"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground" dir="ltr">
                        {s.phone ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t("students.view")}
                            onClick={() => setDetailId(s.id)}
                          >
                            <Eye />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t("students.edit")}
                            onClick={() => openEdit(s)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant={deletingId === s.id ? "destructive" : "ghost"}
                            size="icon-sm"
                            aria-label={
                              deletingId === s.id
                                ? t("students.confirmDelete")
                                : t("students.delete")
                            }
                            onClick={() => void handleRowDelete(s)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <StudentFormDialog
        open={formOpen}
        student={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => void reload()}
      />
      {detail && (
        <StudentDetailDialog
          student={detail}
          onClose={() => setDetailId(null)}
          onEdit={() => openEdit(detail)}
          onDeleted={() => {
            setDetailId(null);
            void reload();
          }}
        />
      )}
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <Users className="size-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">{hasFilters ? t("students.noResults") : t("students.empty")}</p>
      {!hasFilters && <p className="text-sm text-muted-foreground">{t("students.emptyHint")}</p>}
    </div>
  );
}
