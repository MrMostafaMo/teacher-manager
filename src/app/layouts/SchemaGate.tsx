import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/shared/EmptyState";
import { verifySchema, type SchemaReport } from "@/lib/db/schema-check";
import { RECREATABLE_TABLES, repairSchema } from "@/lib/db/schema-repair";
import { toast } from "@/lib/toast-store";

/**
 * Boot-time database gate. Missing transient tables (logs, price history)
 * are recreated empty with a notice; anything else missing means real user
 * data loss, so the content stays blocked with where to repair it.
 */
export function SchemaGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [report, setReport] = useState<SchemaReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let current = await verifySchema();
      if (!current.ok) {
        const fixable = current.missingTables.filter((m) =>
          (RECREATABLE_TABLES as readonly string[]).includes(m),
        );
        if (fixable.length > 0) {
          const fixed = await repairSchema(fixable).catch(() => [] as string[]);
          current = await verifySchema();
          if (fixed.length > 0 && !cancelled) {
            toast(t("error.dbRepaired", { tables: fixed.join(", ") }), "info");
          }
        }
      }
      if (!cancelled && !current.ok) setReport(current);
    })().catch(() => {
      if (!cancelled) setReport({ ok: false, missingTables: [], integrity: "check failed" });
    });
    return () => {
      cancelled = true;
    };
  }, [t]);

  if (!report) return <>{children}</>;

  const missing = report.missingTables.join(", ") || "—";
  const details = `missing: ${missing}\nintegrity: ${report.integrity}`;
  return (
    <Card>
      <CardContent className="p-0">
        <EmptyState
          icon={TriangleAlert}
          title={t("error.dbHealthTitle")}
          description={`${t("error.dbHealthBody")} (${t("error.dbHealthMissing")}: ${missing})`}
          action={
            <span className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => navigate("/settings")}>{t("error.dbHealthSettings")}</Button>
              <Button
                variant="outline"
                onClick={() => void navigator.clipboard.writeText(details)}
              >
                {t("error.copyDetails")}
              </Button>
            </span>
          }
        />
      </CardContent>
    </Card>
  );
}
