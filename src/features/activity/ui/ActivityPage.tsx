import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { TableRowsSkeleton } from "@/shared/Skeletons";
import { PageHeader } from "@/shared/PageHeader";
import { EmptyState } from "@/shared/EmptyState";
import { DataTable } from "@/shared/DataTable";
import { SearchInput } from "@/shared/SearchInput";
import { listStudents } from "@/features/students/application/student-cases";
import { listRecentActivity, ACTION_KEYS, type ActivityLogRow } from "@/lib/activity-log";
import { useTimeStore } from "@/lib/time-store";
import { ENTITY_ICONS, detailsParts } from "./activity-presentation";
import { useActivityColumns } from "./activity-columns";

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
  const columns = useActivityColumns(names, hour24);
  const getRowKey = useCallback((row: ActivityLogRow) => row.id, []);

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
                getRowKey={getRowKey}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
