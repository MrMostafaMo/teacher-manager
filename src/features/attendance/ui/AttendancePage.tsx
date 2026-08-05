import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import dayjs from "dayjs";
import { CalendarCheck, Check, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getDaily,
  getMonthly,
  saveDaily,
  type StudentMonthlyRow,
} from "@/features/attendance/application/attendance-cases";
import { listGroups } from "@/features/groups/application/group-cases";
import type { GroupWithCount } from "@/features/groups/infrastructure/group-repo";
import type { AttendanceStatus } from "@/features/attendance/domain";
import type { Student } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/utils/format";
import { StatusPicker } from "@/shared/StatusPicker";

const inputClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring";

export default function AttendancePage() {
  const { t } = useTranslation();
  const [view, setView] = useState<"daily" | "monthly">("daily");
  const [date, setDate] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [month, setMonth] = useState(() => dayjs().format("YYYY-MM"));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">{t("nav.attendance")}</h2>
          <p className="text-sm text-muted-foreground">{t("attendance.subtitle")}</p>
        </div>
        <div className="flex gap-1">
          {(["daily", "monthly"] as const).map((v) => (
            <Button
              key={v}
              variant={view === v ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView(v)}
            >
              {t(`attendance.${v}`)}
            </Button>
          ))}
        </div>
      </div>

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
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [groups, setGroups] = useState<GroupWithCount[]>([]);
  const [groupId, setGroupId] = useState("");

  useEffect(() => {
    void listGroups()
      .then(setGroups)
      .catch(() => setGroups([]));
  }, []);

  async function load(date: string, groupId: string) {
    setLoading(true);
    setError("");
    try {
      const { students, rows } = await getDaily(date, groupId || undefined);
      const byId = Object.fromEntries(rows.map((r) => [r.studentId, r.status])) as Record<
        string,
        AttendanceStatus
      >;
      setStudents(students);
      setDraft(Object.fromEntries(students.map((s) => [s.id, byId[s.id] ?? "present"])));
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
    const c = { present: 0, absent: 0, late: 0 };
    for (const s of students) c[draft[s.id] ?? "present"] += 1;
    return c;
  }, [students, draft]);

  async function handleSave() {
    // Persist one row per student for the day (present included), so the
    // monthly view counts a saved day exactly once per student.
    const entries = students.map((s) => ({ studentId: s.id, status: draft[s.id] ?? "present" }));
    if (entries.length === 0) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await saveDaily({ date, entries });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      await load(date, groupId);
    } catch (e) {
      console.error("Failed to save attendance", e);
      setError(t("attendance.errors.save"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          {t("attendance.date")}
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && onDateChange(e.target.value)}
            className={inputClass}
          />
        </label>
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          aria-label={t("attendance.groupFilter")}
          className={inputClass}
        >
          <option value="">{t("attendance.allGroups")}</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <Button onClick={() => void handleSave()} disabled={saving || loading}>
          {saving ? t("attendance.saving") : t("attendance.mark")}
        </Button>
        {saved && (
          <Badge className="gap-1 bg-emerald-600/10 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            <Check className="size-3.5" />
            {t("attendance.saved")}
          </Badge>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <SummaryCards students={students} counts={counts} />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              {t("students.loading")}
            </div>
          ) : students.length === 0 ? (
            <EmptyStudents />
          ) : (
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
                  {students.map((s) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-2 font-medium">{s.name}</td>
                      <td className="px-4 py-2">
                        <StatusPicker
                          value={draft[s.id] ?? "present"}
                          onChange={(status) => setDraft((d) => ({ ...d, [s.id]: status }))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCards({
  students,
  counts,
}: {
  students: Student[];
  counts: Record<AttendanceStatus, number>;
}) {
  const { t } = useTranslation();
  const total = students.length;
  const percent = total > 0 ? (counts.present + counts.late) / total : 0;

  const cards: Array<{ key: string; value: string; className?: string }> = [
    { key: "attendance.summary.total", value: String(total) },
    {
      key: "attendance.summary.present",
      value: String(counts.present),
      className: "text-emerald-600 dark:text-emerald-400",
    },
    {
      key: "attendance.summary.absent",
      value: String(counts.absent),
      className: "text-destructive",
    },
    {
      key: "attendance.summary.late",
      value: String(counts.late),
      className: "text-amber-600 dark:text-amber-400",
    },
    { key: "attendance.summary.percentage", value: total > 0 ? formatPercent(percent) : "—" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
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

  const summary = useMemo(() => {
    let sessions = 0;
    let rates: number[] = [];
    for (const r of rows) {
      const total = r.present + r.absent + r.late;
      if (total === 0) continue;
      sessions += total;
      rates.push((r.present + r.late) / total);
    }
    return {
      sessions,
      avgRate: rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : null,
    };
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          {t("attendance.month")}
          <input
            type="month"
            value={month}
            onChange={(e) => e.target.value && onMonthChange(e.target.value)}
            className={inputClass}
          />
        </label>
        <Badge variant="secondary">
          <CalendarCheck className="size-3.5" />
          {t("attendance.sessions")}: {summary.sessions}
        </Badge>
        {summary.avgRate !== null && (
          <Badge variant="secondary">
            {t("attendance.avgRate")}: {formatPercent(summary.avgRate)}
          </Badge>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              {t("students.loading")}
            </div>
          ) : rows.length === 0 ? (
            <EmptyStudents />
          ) : (
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
                      {t("attendance.columns.percentage")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const total = r.present + r.absent + r.late;
                    return (
                      <tr key={r.studentId} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="px-4 py-2.5 font-medium">{r.name}</td>
                        <td className="px-4 py-2.5 text-emerald-600 dark:text-emerald-400">
                          {r.present}
                        </td>
                        <td className="px-4 py-2.5 text-destructive">{r.absent}</td>
                        <td className="px-4 py-2.5 text-amber-600 dark:text-amber-400">
                          {r.late}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {total > 0 ? formatPercent((r.present + r.late) / total) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <Users className="size-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">{t("attendance.empty")}</p>
      <Link to="/students" className="text-sm text-primary hover:underline">
        {t("attendance.emptyHint")}
      </Link>
    </div>
  );
}
