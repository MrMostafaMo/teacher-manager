import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { APP_VERSION } from "@/app/navigation";

export function SettingsAboutCard() {
  const { t } = useTranslation();
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Info className="size-4" />
          {t("settings.about")}
        </div>
        <div className="flex items-start gap-4">
          <img
            src="/logo.png"
            alt={t("app.name")}
            className="size-16 shrink-0 rounded-xl object-contain ring-1 ring-border"
          />
          <div className="space-y-1 text-sm">
            <p className="text-lg font-semibold">{t("app.name")}</p>
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <span>{t("settings.aboutVersion")}</span>
              <span className="font-mono text-foreground" dir="ltr">
                {APP_VERSION}
              </span>
            </p>
            <p className="pt-1 text-xs text-muted-foreground">{t("settings.aboutTagline")}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
