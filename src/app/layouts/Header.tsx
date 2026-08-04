import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import { NAV_ITEMS } from "@/app/navigation";

export function Header() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const current = NAV_ITEMS.find((item) => item.to === pathname) ?? NAV_ITEMS[0];

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b px-4">
      <h1 className="truncate text-sm font-semibold">{t(current.labelKey)}</h1>
    </header>
  );
}
