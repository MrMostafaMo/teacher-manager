import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Cloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useTimeStore } from "@/lib/time-store";
import { formatDateTime } from "@/lib/utils/format";
import { SupabaseSyncSection } from "./SupabaseSyncSection";
import { SyncActionsBar } from "./SyncActionsBar";
import { refreshSyncUi } from "./sync-events";
import { useSyncStore } from "./sync-store";

export function SyncSettingsCard() {
  const { t } = useTranslation();
  const hour24 = useTimeStore((s) => s.hour24);
  const { supabaseEmail, lastSyncAt } = useSyncStore();
  const connected = supabaseEmail !== null;

  useEffect(() => {
    void refreshSyncUi();
  }, []);

  return (
    <Card className="overflow-hidden border-primary/10">
      <div className="relative bg-[linear-gradient(135deg,color-mix(in_oklch,var(--primary)_9%,transparent),color-mix(in_oklch,var(--chart-5)_7%,transparent))] px-5 py-4 ring-1 ring-primary/5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-card shadow-sm ring-1 ring-primary/15">
              <Cloud className="size-5 text-primary" />
            </span>
            <div>
              <h3 className="font-heading text-base font-semibold">{t("sync.settings.title")}</h3>
              <p className="text-xs text-muted-foreground">{t("sync.settings.hint")}</p>
            </div>
          </div>
          <Badge variant={connected ? "success" : "outline"} className="shrink-0 gap-1.5">
            <span className="size-2 rounded-full bg-current animate-pulse" aria-hidden />
            <span className="max-w-36 truncate">{connected ? supabaseEmail : t("sync.status.off")}</span>
          </Badge>
        </div>
        {lastSyncAt !== null && (
          <p className="mt-2 text-[11px] tabular-nums text-muted-foreground">
            {t("sync.status.lastSync")}: {formatDateTime(lastSyncAt, hour24)} • {t("sync.settings.autoHint")}
          </p>
        )}
      </div>
      <CardContent className="space-y-4 p-4">
        <SupabaseSyncSection />
        <SyncActionsBar />
      </CardContent>
    </Card>
  );
}
