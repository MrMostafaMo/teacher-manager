import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Eye, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TableRowsSkeleton } from "@/shared/Skeletons";
import { PageHeader } from "@/shared/PageHeader";
import { EmptyState } from "@/shared/EmptyState";
import { SearchInput } from "@/shared/SearchInput";
import { Select } from "@/components/ui/select";
import {
  deleteStudent,
  listStudents,
} from "@/features/students/application/student-cases";
import { listMemberships } from "@/features/groups/application/group-cases";
import { CollapsibleSection } from "@/shared/CollapsibleSection";
import type { Student } from "@/lib/db/schema";
import { StudentDetailDialog } from "./StudentDetailDialog";
import { StudentFormDialog } from "./StudentFormDialog";
import { StatusBadge } from "./StatusBadge";

type StatusFilter = "all" | "active" | "inactive";

export default function StudentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [groupsByStudent, setGroupsByStudent] = useState<
    Map<string, Array<{ id: string; name: string }>>
  >(new Map());
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [rowsData, memberships] = await Promise.all([
        listStudents({ query, status }),
        listMemberships(),
      ]);
      setRows(rowsData);
      const map = new Map<string, Array<{ id: string; name: string }>>();
      for (const x of memberships) {
        const arr = map.get(x.studentId) ?? [];
        arr.push({ id: x.groupId, name: x.groupName });
        map.set(x.studentId, arr);
      }
      setGroupsByStudent(map);
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

  function StudentsTable({ list }: { list: Student[] }) {
    return (
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
            {list.map((s) => (
              <tr key={s.id} className="border-b last:border-0 hover:bg-muted/50">
                <td className="px-4 py-2.5">
                  <Button
                    variant="ghost"
                    className="h-auto px-0 py-0 font-medium"
                    title={t("students.profile")}
                    onClick={() => navigate(`/students/${s.id}`)}
                  >
                    {s.name}
                  </Button>
                </td>
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
                      title={t("students.profile")}
                      onClick={() => navigate(`/students/${s.id}`)}
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
    );
  }

  const { sections, ungrouped } = (() => {
    const byGroup = new Map<string, { id: string; name: string; list: Student[] }>();
    const ungroupedList: Student[] = [];
    for (const row of rows) {
      const groups = groupsByStudent.get(row.id) ?? [];
      if (groups.length === 0) {
        ungroupedList.push(row);
        continue;
      }
      for (const g of groups) {
        let sec = byGroup.get(g.id);
        if (!sec) {
          sec = { id: g.id, name: g.name, list: [] };
          byGroup.set(g.id, sec);
        }
        sec.list.push(row);
      }
    }
    const sorted = [...byGroup.values()].sort((a, b) => a.name.localeCompare(b.name, "ar"));
    return { sections: sorted, ungrouped: ungroupedList };
  })();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.students")}
        description={t("students.subtitle")}
        actions={
          <Button onClick={openCreate}>
            <Plus />
            {t("students.add")}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={t("students.searchPlaceholder")}
          ariaLabel={t("students.searchPlaceholder")}
        />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          className="w-auto shrink-0"
        >
          <option value="all">{t("students.filterAll")}</option>
          <option value="active">{t("students.statusActive")}</option>
          <option value="inactive">{t("students.statusInactive")}</option>
        </Select>
        <Badge variant="secondary">
          <Users className="size-3.5" />
          {rows.length}
        </Badge>
      </div>

      {loading ? (
        <TableRowsSkeleton rows={5} cols={4} />
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <StudentsEmpty hasFilters={query.trim() !== "" || status !== "all"} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sections.map((sec) => {
            const isCollapsed = !!collapsed[sec.id];
            return (
              <CollapsibleSection
                key={sec.id}
                title={sec.name}
                meta={`${sec.list.length}`}
                collapsed={isCollapsed}
                onToggle={() => setCollapsed((c) => ({ ...c, [sec.id]: !isCollapsed }))}
              >
                <StudentsTable list={sec.list} />
              </CollapsibleSection>
            );
          })}
          {ungrouped.length > 0 && (
            <CollapsibleSection
              key="__ungrouped"
              title={t("students.ungrouped")}
              meta={`${ungrouped.length}`}
              collapsed={!!collapsed.__ungrouped}
              onToggle={() =>
                setCollapsed((c) => ({ ...c, __ungrouped: !collapsed.__ungrouped }))
              }
            >
              <StudentsTable list={ungrouped} />
            </CollapsibleSection>
          )}
        </div>
      )}

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

function StudentsEmpty({ hasFilters }: { hasFilters: boolean }) {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={Users}
      title={hasFilters ? t("students.noResults") : t("students.empty")}
      description={hasFilters ? undefined : t("students.emptyHint")}
    />
  );
}
