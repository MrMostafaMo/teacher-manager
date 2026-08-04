import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import { Check, Languages, MonitorCog, Moon, Sun } from "lucide-react";
import { NAV_ITEMS } from "@/app/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LANGUAGES,
  useLanguageStore,
  type Language,
} from "@/lib/i18n/language-store";
import { useThemeStore, type Theme } from "@/lib/theme/theme-store";

const THEME_ITEMS: { value: Theme; labelKey: string; icon: typeof Sun }[] = [
  { value: "light", labelKey: "common.light", icon: Sun },
  { value: "dark", labelKey: "common.dark", icon: Moon },
  { value: "system", labelKey: "common.system", icon: MonitorCog },
];

export function Header() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const current = NAV_ITEMS.find((item) => item.to === pathname) ?? NAV_ITEMS[0];

  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b px-4">
      <h1 className="truncate text-sm font-semibold">{t(current.labelKey)}</h1>

      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("common.language")}
              title={t("common.language")}
            >
              <Languages className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("common.language")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {LANGUAGES.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onSelect={() => setLanguage(lang.code as Language)}
              >
                {lang.label}
                {language === lang.code && <Check className="ms-auto size-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("common.theme")}
              title={t("common.theme")}
            >
              <MonitorCog className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("common.theme")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {THEME_ITEMS.map((item) => (
              <DropdownMenuItem key={item.value} onSelect={() => setTheme(item.value)}>
                <item.icon className="size-4" />
                {t(item.labelKey)}
                {theme === item.value && <Check className="ms-auto size-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
