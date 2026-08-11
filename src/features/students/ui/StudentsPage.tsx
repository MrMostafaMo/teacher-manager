import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TableRowsSkeleton } from "@/shared/Skeletons";
import { PageHeader } from "@/shared/PageHeader";
import { buildSectionsByGroup } from "@/lib/build-grouped-sections";
import { deleteStudent, listStudents } from "@/features/students/application/student-cases";
import { listMemberships } from "@/features/groups/application/group-cases";
import type { Student } from "@/lib/db/schema";
import { useConfirmDelete } from "@/shared/useConfirmDelete";
import { StudentFilters } from "./StudentFilters";
import { StudentsDialogs } from "./students-dialogs";
import { StudentsEmpty } from "./StudentsTable";
import { StudentsSections } from "./student-sections";

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
  const { armed: deletingId, request, clear } = useConfirmDelete();
  const [groupsByStudent, setGroupsByStudent] = useState<Map<string, Array<{ id: string; name: string }>>>(new Map());
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

  const openEdit = useCallback((student: Student) => {
    setDetailId(null);
    setEditing(student);
    setFormOpen(true);
  }, []);

  const handleRowDelete = useCallback(
    async (student: Student) => {
      if (!request(student.id)) return;
      try {
        await deleteStudent(student.id);
        void reload();
      } catch (error) {
        console.error("Failed to delete student", error);
      } finally {
        clear();
      }
    },
    [request, clear, reload],
  );

  const { sections, ungrouped } = useMemo(
    () => buildSectionsByGroup(rows, (s) => groupsByStudent.get(s.id) ?? []),
    [rows, groupsByStudent],
  );

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

      <StudentFilters
        query={query}
        onQueryChange={setQuery}
        status={status}
        onStatusChange={setStatus}
        count={rows.length}
      />

      {loading ? (
        <TableRowsSkeleton rows={5} cols={4} />
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <StudentsEmpty hasFilters={query.trim() !== "" || status !== "all"} />
          </CardContent>
        </Card>
      ) : (
        <StudentsSections
          sections={sections}
          ungrouped={ungrouped}
          deletingId={deletingId}
          collapsed={collapsed}
          onToggle={(id) => setCollapsed((c) => ({ ...c, [id]: !c[id] }))}
          onOpen={openEdit}
          onDelete={handleRowDelete}
        />
      )}

      <StudentsDialogs
        formOpen={formOpen}
        editing={editing}
        onCloseForm={() => setFormOpen(false)}
        onSaved={() => void reload()}
        detail={detail}
        onCloseDetail={() => setDetailId(null)}
        onEdit={openEdit}
        onDeleted={() => {
          setDetailId(null);
          void reload();
        }}
      />
    </div>
  );
}
