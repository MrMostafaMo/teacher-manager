import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { GraduationCap } from "lucide-react";
import { APP_VERSION, NAV_ITEMS } from "@/app/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { t } = useTranslation();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-e bg-background">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b px-4">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GraduationCap className="size-4" />
        </div>
        <span className="truncate text-sm font-semibold">{t("app.name")}</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto overscroll-none p-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                isActive
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )
            }
          >
            <item.icon className="size-4 shrink-0" />
            <span className="truncate">{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>

      <div className="shrink-0 border-t px-4 py-3 text-xs text-muted-foreground">
        {t("app.name")} · v{APP_VERSION}
      </div>
    </aside>
  );
}
