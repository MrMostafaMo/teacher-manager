import { compareGroupsByName } from "@/lib/utils/group-sort";
import type { SessionDuesRow } from "@/features/payments/application/session-dues-cases";

export type Section = { id: string; name: string; rows: SessionDuesRow[] };

export function groupRows(rows: SessionDuesRow[]) {
  const byGroup = new Map<string, Section>();
  const ungrouped: SessionDuesRow[] = [];
  for (const r of rows) {
    if (r.groups.length === 0) ungrouped.push(r);
    else for (const g of r.groups) {
      let sec = byGroup.get(g.id);
      if (!sec) { sec = { id: g.id, name: g.name, rows: [] }; byGroup.set(g.id, sec); }
      sec.rows.push(r);
    }
  }
  return { sections: [...byGroup.values()].sort((a, b) => compareGroupsByName(a, b)), ungrouped };
}

export function countByStatus(rows: SessionDuesRow[]) {
  return {
    warn: rows.filter((r) => r.status === "warning").length,
    due: rows.filter((r) => r.status === "due").length,
  };
}
