import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Database, Languages, MonitorCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ensureSchemaVersion, touchLastOpened } from "@/lib/db/app-meta";
import { applyLanguage } from "@/lib/i18n";
import { useLanguageStore, type Language } from "@/lib/i18n/language-store";
import { applyTheme, useThemeStore, type Theme } from "@/lib/theme/theme-store";

type DbStatus = "checking" | "connected" | "error";

const THEME_ORDER: Theme[] = ["light", "dark", "system"];

/**
 * Phase 0 smoke screen.
 *
 * Proves the whole offline pipeline end-to-end: SQLite auto-initialized by the
 * Tauri SQL plugin (embedded migration), Drizzle proxy driver, i18n + RTL and
 * theming. Replaced by the routed app shell in Phase 1.
 */
export default function App() {
  const { t } = useTranslation();
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const [dbStatus, setDbStatus] = useState<DbStatus>("checking");
  const [schemaVersion, setSchemaVersion] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const version = await ensureSchemaVersion();
        await touchLastOpened();
        if (!cancelled) {
          setSchemaVersion(version);
          setDbStatus("connected");
        }
      } catch (error) {
        console.error("Database initialization failed", error);
        if (!cancelled) setDbStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    applyLanguage(language);
  }, [language]);

  function toggleLanguage() {
    const next: Language = language === "ar" ? "en" : "ar";
    setLanguage(next);
  }

  function cycleTheme() {
    const next = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length];
    setTheme(next);
    applyTheme(next);
  }

  const statusBadge =
    dbStatus === "connected" ? (
      <Badge className="bg-emerald-600/10 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
        {t("db.connected")}
      </Badge>
    ) : dbStatus === "error" ? (
      <Badge variant="destructive">{t("db.error")}</Badge>
    ) : (
      <Badge variant="secondary">{t("db.checking")}</Badge>
    );

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="gap-1 text-center">
          <CardTitle className="text-2xl">{t("app.name")}</CardTitle>
          <CardDescription>{t("app.tagline")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Languages className="size-4" />
              {t("common.language")}
            </span>
            <Button variant="outline" size="sm" onClick={toggleLanguage}>
              {language === "ar" ? "English" : "العربية"}
            </Button>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <MonitorCog className="size-4" />
              {t("common.theme")}
            </span>
            <Button variant="outline" size="sm" onClick={cycleTheme}>
              {t(`common.${theme}`)}
            </Button>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Database className="size-4" />
              {t("app.phase")} 0
            </span>
            {statusBadge}
          </div>
        </CardContent>
        <CardFooter className="justify-center text-xs text-muted-foreground">
          {dbStatus === "connected" && (
            <>
              {t("db.schemaVersion")}: {schemaVersion}
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
