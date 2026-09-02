import { compareGroupsByName } from "@/lib/utils/group-sort";
import { deriveCycle } from "@/features/payments/application/session-dues";
import type { SessionDuesRow } from "@/features/payments/application/session-dues-cases";

export type GroupSettings = Map<string, { sessionsPerCycle: number | null; warningAt: number | null }>;
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

function enrichRow(r: SessionDuesRow, S: number, W: number): SessionDuesRow {
  const raw = Number((r as unknown as { rawCount?: number }).rawCount ?? r.count) || 0;
  const Snum = Number(S) || 8;
  const Wnum = Number(W) || Snum - 2;
  const d = deriveCycle(raw, Snum, Wnum, r.lastPaidISO != null);
  const price = r.pricePerSession != null && Number.isFinite(Snum) && Snum > 0
    ? Math.round((r.fullCycleAmount ?? 0) / Snum)
    : r.pricePerSession;
  return {
    ...r,
    count: d.displayCount,
    rawCount: raw,
    cyclesOverdue: d.cyclesOverdue,
    isOverdue: d.isOverdue,
    showPaid: d.showPaid,
    status: d.status,
    remainingSessions: d.remainingSessions,
    pricePerSession: price,
    remainingAmount: price != null ? d.remainingSessions * price : null,
  } as SessionDuesRow;
}

export function enrichSections(
  sections: Section[],
  groupSettings: GroupSettings,
  globalS: number,
  globalW: number,
) {
  return sections.map((sec) => {
    const cfg = groupSettings.get(sec.id);
    const rawS = cfg?.sessionsPerCycle;
    const rawW = cfg?.warningAt;
    const S = rawS != null && Number.isFinite(Number(rawS)) ? Number(rawS) : Number(globalS) || 8;
    const Wraw = rawW != null && Number.isFinite(Number(rawW))
      ? Number(rawW)
      : rawS != null && Number.isFinite(Number(rawS)) ? Number(rawS) - 2 : Number(globalW) || 6;
    const W = Number.isFinite(Wraw) ? Wraw : S - 2;
    const effRows = sec.rows.map((r) => enrichRow(r, S, W));
    return { sec, effRows, warn: effRows.filter((r) => r.status === "warning").length, due: effRows.filter((r) => r.status === "due").length, S };
  });
}

export function enrichUngrouped(ungrouped: SessionDuesRow[], globalS: number, globalW: number) {
  if (ungrouped.length === 0) return { rows: [] as SessionDuesRow[], warn: 0, due: 0 };
  const S = Number(globalS) || 8;
  const W = Number(globalW) || S - 2;
  const rows = ungrouped.map((r) => enrichRow(r, S, W));
  return { rows, warn: rows.filter((r) => r.status === "warning").length, due: rows.filter((r) => r.status === "due").length };
}
