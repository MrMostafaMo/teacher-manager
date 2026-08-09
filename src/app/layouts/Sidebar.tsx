import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { APP_VERSION, NAV_ITEMS, NAV_SECTIONS } from "@/app/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { t } = useTranslation();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-e bg-background">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b px-4">
        <img
          src="/logo.png"
          alt={t("app.name")}
          className="size-7 shrink-0 rounded-md object-contain"
        />
        <span className="truncate text-sm font-semibold">{t("app.name")}</span>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto overscroll-none p-2">
        {NAV_SECTIONS.map((section) => (
          <div key={section.id}>
            <p className="px-2.5 pb-1.5 text-xs font-semibold tracking-wide text-muted-foreground/70">
              {t(section.labelKey)}
            </p>
            <div className="space-y-0.5">
              {NAV_ITEMS.filter((item) => item.section === section.id).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-accent font-medium text-accent-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span
                          aria-hidden
                          className="absolute inset-y-1.5 inset-inline-start-0 w-0.5 rounded-full bg-primary"
                        />
                      )}
                      <item.icon className="size-4 shrink-0" />
                      <span className="truncate">{t(item.labelKey)}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t px-4 py-3 text-xs text-muted-foreground">
        {t("app.name")} · v{APP_VERSION}
      </div>
    </aside>
  );
}
