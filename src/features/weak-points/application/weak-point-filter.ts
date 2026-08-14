import type { StudentWeakPoint } from "./weak-point-cases";

export type WeakPointStatusFilter = "all" | "active" | "resolved";

/** Page-level filter: status + free-text query over description or student name. */
export function filterWeakPoints(
  rows: StudentWeakPoint[],
  status: WeakPointStatusFilter,
  query: string,
  studentName: (studentId: string) => string,
): StudentWeakPoint[] {
  const q = query.trim().toLowerCase();
  return rows.filter((row) => {
    if (status === "active" && row.resolved) return false;
    if (status === "resolved" && !row.resolved) return false;
    if (!q) return true;
    return (
      row.description.toLowerCase().includes(q) ||
      studentName(row.studentId).toLowerCase().includes(q)
    );
  });
}
