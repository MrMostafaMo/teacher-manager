import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AppWindow,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  FileText,
  NotebookPen,
  Receipt,
  ScrollText,
  Target,
  User,
  Users2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { TableRowsSkeleton } from "@/shared/Skeletons";
import { PageHeader } from "@/shared/PageHeader";
import { EmptyState } from "@/shared/EmptyState";
import { DataTable, type DataTableColumn } from "@/shared/DataTable";
import { SearchInput } from "@/shared/SearchInput";
import { listStudents } from "@/features/students/application/student-cases";
import { listRecentActivity, type ActivityLogRow } from "@/lib/activity-log";
import { useTimeStore } from "@/lib/time-store";
import { formatDateTime, formatMoney } from "@/lib/utils/format";

const ENTITY_ICONS: Record<string, LucideIcon> = {
  app: AppWindow,
  student: User,
  payment: Wallet,
  plan: FileText,
  expense: Receipt,
  skill: Target,
  homework: NotebookPen,
  schedule: CalendarDays,
  group: Users2,
  exam: ClipboardList,
  attendance: CalendarCheck,
};

/** Maps stored action strings to i18n keys under `activity.actions.*`. */
export const ACTION_KEYS: Record<string, string> = {
  "app.launch": "appLaunch",
  "student.create": "studentCreate",
  "student.update": "studentUpdate",
  "student.delete": "studentDelete",
  "payment.create": "paymentCreate",
  "payment.update": "paymentUpdate",
  "payment.delete": "paymentDelete",
  "plan.create": "planCreate",
  "plan.update": "planUpdate",
  "plan.delete": "planDelete",
  "expense.create": "expenseCreate",
  "expense.update": "expenseUpdate",
  "expense.delete": "expenseDelete",
  "skill.create": "skillCreate",
  "skill.update": "skillUpdate",
  "skill.delete": "skillDelete",
  "skill.level": "skillLevel",
  "homework.create": "homeworkCreate",
  "homework.update": "homeworkUpdate",
  "homework.delete": "homeworkDelete",
  "homework.submit": "homeworkSubmit",
  "homework.submitAll": "homeworkSubmitAll",
  "debug.check": "debugCheck",
  "sessions.date": "sessionsDate",
  "schedule.create": "scheduleCreate",
  "schedule.update": "scheduleUpdate",
  "schedule.delete": "scheduleDelete",
  "schedule.attendance.save": "scheduleAttendanceSave",
  "group.create": "groupCreate",
  "group.update": "groupUpdate",
  "group.delete": "groupDelete",
  "group.member.add": "groupMemberAdd",
  "group.member.remove": "groupMemberRemove",
  "exam.create": "examCreate",
  "exam.update": "examUpdate",
  "exam.delete": "examDelete",
  "exam.result": "examResult",
  "attendance.save": "attendanceSave",
};

function detailsParts(row: ActivityLogRow, names: Map<string, string>): string[] {
  if (!row.details) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(row.details);
  } catch {
    return [];
  }
  if (typeof parsed !== "object" || parsed === null) return [];
  const d = parsed as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof d.name === "string" && d.name) parts.push(d.name);
  if (typeof d.title === "string" && d.title) parts.push(d.title);
  if (typeof d.groupName === "string" && d.groupName) parts.push(d.groupName);
  if (typeof d.studentId === "string") {
    const name = names.get(d.studentId);
    if (name) parts.push(name);
  }
  if (typeof d.amount === "number") parts.push(formatMoney(d.amount));
  if (typeof d.score === "number") parts.push(String(d.score));
  if (typeof d.period === "string" && /^\d{4}-\d{2}$/.test(d.period)) parts.push(d.period);
  return parts;
}

export default function ActivityPage() {
  const { t } = useTranslation();
  const hour24 = useTimeStore((s) => s.hour24);
  const [rows, setRows] = useState<ActivityLogRow[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [entity, setEntity] = useState("all");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [logs, students] = await Promise.all([
          listRecentActivity(300),
          listStudents({ status: "all" }),
        ]);
        if (cancelled) return;
        setRows(logs);
        setNames(new Map(students.map((s) => [s.id, s.name])));
      } catch (e) {
        console.error("Failed to load activity", e);
        if (!cancelled) setError(t("activity.loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (entity !== "all" && row.entityType !== entity) return false;
      if (!q) return true;
      const labelKey = ACTION_KEYS[row.action];
      const haystack = [
        t(labelKey ? `activity.actions.${labelKey}` : "activity.actions.unknown"),
        t(`activity.entities.${row.entityType}`),
        ...detailsParts(row, names),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, query, entity, names, t]);

  const entities = Object.keys(ENTITY_ICONS);

  const columns: DataTableColumn<ActivityLogRow>[] = [
    {
      header: t("activity.columns.time"),
      className: "whitespace-nowrap tabular-nums text-muted-foreground",
      render: (row) => <span dir="ltr">{formatDateTime(row.createdAt, hour24)}</span>,
    },
    {
      header: t("activity.columns.action"),
      render: (row) => {
        const Icon = ENTITY_ICONS[row.entityType] ?? AppWindow;
        const labelKey = ACTION_KEYS[row.action];
        return (
          <span className="flex items-center gap-2">
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <span className="font-medium">
              {t(labelKey ? `activity.actions.${labelKey}` : "activity.actions.unknown")}
            </span>
          </span>
        );
      },
    },
    {
      header: t("activity.columns.details"),
      className: "text-muted-foreground",
      render: (row) => {
        const parts = detailsParts(row, names);
        return parts.length > 0 ? parts.join(" · ") : "—";
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.activity")} description={t("activity.subtitle")} />

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={t("activity.searchPlaceholder")}
          ariaLabel={t("activity.searchPlaceholder")}
        />
        <Select
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          aria-label={t("activity.filterAll")}
          className="w-auto shrink-0"
        >
          <option value="all">{t("activity.filterAll")}</option>
          {entities.map((k) => (
            <option key={k} value={k}>
              {t(`activity.entities.${k}`)}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <TableRowsSkeleton rows={8} cols={4} />
      ) : error ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={ScrollText}
              title={rows.length === 0 ? t("activity.empty") : t("activity.noResults")}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {t("activity.summary", { count: filtered.length })}
          </p>
          <Card>
            <CardContent className="p-0">
              <DataTable<ActivityLogRow>
                columns={columns}
                rows={filtered}
                getRowKey={(row) => row.id}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
