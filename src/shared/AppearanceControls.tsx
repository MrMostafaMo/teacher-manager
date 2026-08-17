import { useTranslation } from "react-i18next";
import { Check, ChevronsUpDown, Languages, MonitorCog, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LANGUAGES, useLanguageStore, type Language } from "@/lib/i18n/language-store";
import { useThemeStore, type Theme } from "@/lib/theme/theme-store";

const THEME_ITEMS: { value: Theme; labelKey: string; icon: typeof Sun }[] = [
  { value: "light", labelKey: "common.light", icon: Sun },
  { value: "dark", labelKey: "common.dark", icon: Moon },
  { value: "system", labelKey: "common.system", icon: MonitorCog },
];

export function LanguageSelector() {
  const { t } = useTranslation();
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" aria-label={t("common.language")}>
          <Languages className="size-4" />
          {current.label}
          <ChevronsUpDown className="ms-auto size-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("common.language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem key={lang.code} onSelect={() => setLanguage(lang.code as Language)}>
            {lang.label}
            {language === lang.code && <Check className="ms-auto size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeSelector() {
  const { t } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const current = THEME_ITEMS.find((i) => i.value === theme) ?? THEME_ITEMS[2];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" aria-label={t("common.theme")}>
          <current.icon className="size-4" />
          {t(current.labelKey)}
          <ChevronsUpDown className="ms-auto size-3 opacity-50" />
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
  );
}
