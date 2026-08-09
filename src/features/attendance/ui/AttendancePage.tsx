import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import dayjs from "dayjs";
import { Check, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  getDaily,
  getMonthly,
  saveDaily,
  type StudentMonthlyRow,
} from "@/features/attendance/application/attendance-cases";
import { listGroups, listMemberships } from "@/features/groups/application/group-cases";
import type { GroupWithCount } from "@/features/groups/infrastructure/group-repo";
import type { AttendanceStatus } from "@/features/attendance/domain";
import type { Student } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/utils/format";
import { CollapsibleSection } from "@/shared/CollapsibleSection";
import { StatusPicker } from "@/shared/StatusPicker";
import { TableRowsSkeleton } from "@/shared/Skeletons";
import { DatePicker, MonthPicker } from "@/shared/DatePicker";
import { PageHeader } from "@/shared/PageHeader";
import { EmptyState } from "@/shared/EmptyState";
import { Segmented } from "@/shared/Segmented";
import { useSaveFeedback } from "@/shared/useSaveFeedback";

const inputClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring dark:bg-muted/50";

export default function AttendancePage() {
  const { t } = useTranslation();
  const [view, setView] = useState<"daily" | "monthly">("daily");
  const [date, setDate] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [month, setMonth] = useState(() => dayjs().format("YYYY-MM"));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.attendance")}
        description={t("attendance.subtitle")}
        actions={
          <Segmented
            value={view}
            onChange={setView}
            options={(["daily", "monthly"] as const).map((v) => ({
              value: v,
              label: t(`attendance.${v}`),
            }))}
            ariaLabel={t("attendance.viewLabel")}
          />
        }
      />

      {view === "daily" ? (
        <DailyView date={date} onDateChange={setDate} />
      ) : (
        <MonthlyView month={month} onMonthChange={setMonth} />
      )}
    </div>
  );
}

function DailyView({ date, onDateChange }: { date: string; onDateChange: (d: string) => void }) {
  const { t } = useTranslation();
  const [students, setStudents] = useState<Student[]>([]);
  const [draft, setDraft] = useState<Record<string, AttendanceStatus | undefined>>({});
  const [savedStatuses, setSavedStatuses] = useState<Record<string, AttendanceStatus | undefined>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { saving, saved, run } = useSaveFeedback();
  const [groups, setGroups] = useState<GroupWithCount[]>([]);
  const [groupId, setGroupId] = useState("");
  const [hasSessionsToday, setHasSessionsToday] = useState(true);
  const groupsByStudent = useMemberships();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const isFuture = date > dayjs().format("YYYY-MM-DD");

  useEffect(() => {
    void listGroups()
      .then(setGroups)
      .catch(() => setGroups([]));
  }, []);

  async function load(date: string, groupId: string) {
    setLoading(true);
    setError("");
    try {
      const { students, rows, hasSessionsToday, defaults } = await getDaily(date, groupId || undefined);
      const byId = Object.fromEntries(rows.map((r) => [r.studentId, r.status])) as Record<
        string,
        AttendanceStatus
      >;
      setHasSessionsToday(hasSessionsToday);
      setStudents(students);
      setSavedStatuses(byId);
      setDraft(
        Object.fromEntries(students.map((s) => [s.id, byId[s.id] ?? defaults[s.id]])),
      );
    } catch (e) {
      console.error("Failed to load attendance", e);
      setError(t("attendance.errors.load"));
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(date, groupId);
  }, [date, groupId]);

  const counts = useMemo(() => {
    const c: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const s of students) {
      const status = draft[s.id];
      if (status) c[status] += 1;
    }
    return c;
  }, [students, draft]);

  const marked = counts.present + counts.absent + counts.late + counts.excused;

  const dirty = students.some((s) => draft[s.id] !== savedStatuses[s.id]);

  const { sections, ungrouped } = buildSections(students, groupsByStudent, (s) => s.id);

  async function handleSave() {
    // Persist one row per student with an explicit status; unmarked students
    // (future days / sessions that haven't started) are skipped so nothing is
    // recorded before the day's session begins.
    if (isFuture) return;
    const entries = students
      .map((s) => ({ studentId: s.id, status: draft[s.id] }))
      .filter(
        (e): e is { studentId: string; status: AttendanceStatus } => e.status != null,
      );
    if (entries.length === 0) return;
    try {
      await run(async () => {
        await saveDaily({ date, entries });
        setSavedStatuses(Object.fromEntries(entries.map((e) => [e.studentId, e.status])));
        await load(date, groupId);
      });
    } catch (e) {
      console.error("Failed to save attendance", e);
      setError(t("attendance.errors.save"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          {t("attendance.date")}
          <DatePicker
            value={date}
            onChange={(v) => v && onDateChange(v)}
            ariaLabel={t("attendance.date")}
            className={inputClass}
          />
        </label>
        <Select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          aria-label={t("attendance.groupFilter")}
          className="w-auto shrink-0"
        >
          <option value="">{t("attendance.todayGroups")}</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
        <Button onClick={() => void handleSave()} disabled={saving || loading || isFuture}>
          {saving ? t("attendance.saving") : t("attendance.mark")}
        </Button>
        {isFuture && (
          <span className="text-sm text-muted-foreground">{t("attendance.futureLocked")}</span>
        )}
        {saved && (
          <Badge className="gap-1 bg-success/10 text-success">
            <Check className="size-3.5" />
            {t("attendance.saved")}
          </Badge>
        )}
      </div>

      {dirty && !saving && students.length > 0 && (
        <p className="text-xs text-warning">{t("attendance.draftHint")}</p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <SummaryCards
        total={students.length}
        totalLabel="attendance.summary.total"
        counts={counts}
        unmarked={students.length - marked}
        rate={marked > 0 ? (counts.present + counts.late + counts.excused) / marked : null}
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <TableRowsSkeleton rows={5} cols={3} />
          ) : students.length === 0 ? (
            hasSessionsToday ? (
              <EmptyStudents />
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">
                {t("attendance.noSessionsToday")}
              </p>
            )
          ) : (
            <div className="space-y-4 p-4">
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
                    <RosterTable
                      list={sec.list}
                      groupLabel={sec.name}
                      draft={draft}
                      onChange={(studentId, status) =>
                        setDraft((d) => ({ ...d, [studentId]: status }))
                      }
                    />
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
                  <RosterTable
                    list={ungrouped}
                    groupLabel={t("students.ungrouped")}
                    draft={draft}
                    onChange={(studentId, status) =>
                      setDraft((d) => ({ ...d, [studentId]: status }))
                    }
                  />
                </CollapsibleSection>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCards({
  total,
  totalLabel,
  counts,
  unmarked,
  rate,
}: {
  total: number;
  totalLabel: string;
  counts: Record<AttendanceStatus, number>;
  /** Daily sheet: students left without a chosen status (skips the card when omitted). */
  unmarked?: number;
  /** Attendance rate (0–1); null renders "—". */
  rate: number | null;
}) {
  const { t } = useTranslation();

  const cards: Array<{ key: string; value: string; className?: string }> = [
    { key: totalLabel, value: String(total) },
    {
      key: "attendance.summary.present",
      value: String(counts.present),
      className: "text-success",
    },
    {
      key: "attendance.summary.absent",
      value: String(counts.absent),
      className: "text-destructive",
    },
    {
      key: "attendance.summary.late",
      value: String(counts.late),
      className: "text-warning",
    },
    {
      key: "attendance.summary.excused",
      value: String(counts.excused),
      className: "text-(--chart-5)",
    },
  ];
  if (unmarked !== undefined) {
    cards.push({
      key: "attendance.summary.unmarked",
      value: String(unmarked),
      className: "text-muted-foreground",
    });
  }
  cards.push({
    key: "attendance.summary.percentage",
    value: rate !== null ? formatPercent(rate) : "—",
  });

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2",
        unmarked !== undefined ? "sm:grid-cols-7" : "sm:grid-cols-6",
      )}
    >
      {cards.map((c) => (
        <div
          key={c.key}
          className="flex flex-col gap-1 rounded-lg border bg-card p-3 text-sm"
        >
          <p className="text-xs text-muted-foreground">{t(c.key)}</p>
          <p className={cn("text-lg font-semibold", c.className)}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

function MonthlyView({ month, onMonthChange }: { month: string; onMonthChange: (m: string) => void }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<StudentMonthlyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const groupsByStudent = useMemberships();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoading(true);
    setError("");
    getMonthly(month)
      .then(setRows)
      .catch((e) => {
        console.error("Failed to load monthly stats", e);
        setError(t("attendance.errors.load"));
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [month]);

  const totals = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;
    for (const r of rows) {
      present += r.present;
      absent += r.absent;
      late += r.late;
      excused += r.excused;
    }
    const total = present + absent + late + excused;
    return {
      counts: { present, absent, late, excused },
      total,
      rate: total > 0 ? (present + late + excused) / total : null,
    };
  }, [rows]);

  const { sections, ungrouped } = buildSections(rows, groupsByStudent, (r) => r.studentId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          {t("attendance.month")}
          <MonthPicker
            value={month}
            onChange={(v) => v && onMonthChange(v)}
            ariaLabel={t("attendance.month")}
            className={inputClass}
          />
        </label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && rows.length > 0 && (
        <SummaryCards
          total={totals.total}
          totalLabel="attendance.summary.totalMonth"
          counts={totals.counts}
          rate={totals.rate}
        />
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <TableRowsSkeleton rows={5} cols={3} />
          ) : rows.length === 0 ? (
            <EmptyStudents />
          ) : (
            <div className="space-y-4 p-4">
              {sections.map((sec) => {
                const isCollapsed = !!collapsed[`summary-${sec.id}`];
                return (
                  <CollapsibleSection
                    key={`summary-${sec.id}`}
                    title={sec.name}
                    meta={`${sec.list.length}`}
                    collapsed={isCollapsed}
                    onToggle={() =>
                      setCollapsed((c) => ({ ...c, [`summary-${sec.id}`]: !isCollapsed }))
                    }
                  >
                    <MonthlySummaryTable list={sec.list} groupLabel={sec.name} />
                  </CollapsibleSection>
                );
              })}
              {ungrouped.length > 0 && (
                <CollapsibleSection
                  key="summary-__ungrouped"
                  title={t("students.ungrouped")}
                  meta={`${ungrouped.length}`}
                  collapsed={!!collapsed["summary-__ungrouped"]}
                  onToggle={() =>
                    setCollapsed((c) => ({
                      ...c,
                      "summary-__ungrouped": !collapsed["summary-__ungrouped"],
                    }))
                  }
                >
                  <MonthlySummaryTable list={ungrouped} groupLabel={t("students.ungrouped")} />
                </CollapsibleSection>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyStudents() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={Users}
      title={t("attendance.empty")}
      description={
        <Link to="/students" className="text-primary hover:underline">
          {t("attendance.emptyHint")}
        </Link>
      }
    />
  );
}

interface Membership {
  id: string;
  name: string;
}

/** studentId → its memberships (one class per student since Phase 21+). */
function useMemberships(): Map<string, Membership[]> {
  const [groupsByStudent, setGroupsByStudent] = useState<Map<string, Membership[]>>(new Map());

  useEffect(() => {
    let cancelled = false;
    void listMemberships()
      .then((memberships) => {
        const map = new Map<string, Membership[]>();
        for (const x of memberships) {
          const arr = map.get(x.studentId) ?? [];
          arr.push({ id: x.groupId, name: x.groupName });
          map.set(x.studentId, arr);
        }
        if (!cancelled) setGroupsByStudent(map);
      })
      .catch(() => {
        if (!cancelled) setGroupsByStudent(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return groupsByStudent;
}

/** Split rows into per-group sections (sorted by name) + an ungrouped bucket. */
function buildSections<T>(
  rows: T[],
  groupsByStudent: Map<string, Membership[]>,
  keyOf: (row: T) => string,
): { sections: Array<{ id: string; name: string; list: T[] }>; ungrouped: T[] } {
  const byGroup = new Map<string, { id: string; name: string; list: T[] }>();
  const ungroupedList: T[] = [];
  for (const row of rows) {
    const groups = groupsByStudent.get(keyOf(row)) ?? [];
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
}

function RosterTable({
  list,
  groupLabel,
  draft,
  onChange,
}: {
  list: Student[];
  groupLabel: string;
  draft: Record<string, AttendanceStatus | undefined>;
  onChange: (studentId: string, status: AttendanceStatus) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="px-4 py-2.5 text-start font-medium">
              {t("attendance.columns.student")}
            </th>
            <th className="px-4 py-2.5 text-start font-medium">
              {t("attendance.columns.status")}
            </th>
          </tr>
        </thead>
        <tbody>
          {list.map((s) => (
            <tr key={s.id} className="border-b last:border-0 hover:bg-muted/50">
              <td className="px-4 py-2">
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">{groupLabel}</p>
              </td>
              <td className="px-4 py-2">
                <StatusPicker
                  value={draft[s.id]}
                  onChange={(status) => onChange(s.id, status)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MonthlySummaryTable({ list, groupLabel }: { list: StudentMonthlyRow[]; groupLabel: string }) {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="px-4 py-2.5 text-start font-medium">
              {t("attendance.columns.student")}
            </th>
            <th className="px-4 py-2.5 text-start font-medium">
              {t("attendance.columns.present")}
            </th>
            <th className="px-4 py-2.5 text-start font-medium">
              {t("attendance.columns.absent")}
            </th>
            <th className="px-4 py-2.5 text-start font-medium">
              {t("attendance.columns.late")}
            </th>
            <th className="px-4 py-2.5 text-start font-medium">
              {t("attendance.columns.excused")}
            </th>
            <th className="px-4 py-2.5 text-start font-medium">
              {t("attendance.columns.percentage")}
            </th>
          </tr>
        </thead>
        <tbody>
          {list.map((r) => {
            const total = r.present + r.absent + r.late + r.excused;
            return (
              <tr key={r.studentId} className="border-b last:border-0 hover:bg-muted/50">
                <td className="px-4 py-2.5">
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{groupLabel}</p>
                </td>
                <td className="px-4 py-2.5 text-success">{r.present}</td>
                <td className="px-4 py-2.5 text-destructive">{r.absent}</td>
                <td className="px-4 py-2.5 text-warning">{r.late}</td>
                <td className="px-4 py-2.5 text-(--chart-5)">{r.excused}</td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {total > 0 ? formatPercent((r.present + r.late + r.excused) / total) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
