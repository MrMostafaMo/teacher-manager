import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SettingsCardShell } from "@/shared/SettingsCardShell";
import { APP_VERSION } from "@/app/navigation";
import { Info } from "lucide-react";

export function SettingsAboutCard() {
  const { t } = useTranslation();
  return (
    <SettingsCardShell icon={Info} title={t("settings.about")} description={t("settings.aboutTagline")}>
      <div className="flex items-start gap-4">
        <img src="/logo.png" alt={t("app.name")} className="size-16 shrink-0 rounded-2xl object-contain ring-1 ring-border" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-heading text-lg font-semibold leading-none">{t("app.name")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1.5 font-mono text-xs" dir="ltr">
              {t("settings.aboutVersion")} {APP_VERSION}
            </Badge>
            <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success ring-1 ring-success/20">Offline</span>
          </div>
        </div>
      </div>
      <Separator className="my-4" />
      <div className="rounded-xl bg-muted/40 px-3 py-2.5 ring-1 ring-border/50">
        <p className="text-xs leading-relaxed text-muted-foreground">{t("settings.aboutTagline")}</p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground/70" dir="ltr">SQLite • Tauri v2 • {APP_VERSION}</p>
      </div>
    </SettingsCardShell>
  );
}
