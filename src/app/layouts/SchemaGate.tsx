import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/shared/EmptyState";
import { verifySchema, type SchemaReport } from "@/lib/db/schema-check";

/**
 * Boot-time database gate: pages assume every table exists, so a damaged
 * file shows up as half-empty screens. When the check fails, block the
 * content with what is missing and where to repair it.
 */
export function SchemaGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [report, setReport] = useState<SchemaReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    void verifySchema().then((r) => {
      if (!cancelled && !r.ok) setReport(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
