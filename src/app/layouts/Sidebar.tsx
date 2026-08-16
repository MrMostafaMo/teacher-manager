import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { ShieldCheck } from "lucide-react";
import { APP_VERSION, NAV_ITEMS, NAV_SECTIONS } from "@/app/navigation";
import { cn } from "@/lib/utils";

/**
 * Sidebar with two modes: full (w-64) at lg+; a compact icon rail (w-16)
 * below lg that expands to w-64 on hover/focus to reveal labels. The rail
 * stays in flow so expanding simply pushes content (RTL-safe, no overlap).
 */
export function Sidebar() {
  const { t } = useTranslation();

  return (
    <aside className="group z-30 flex w-16 shrink-0 flex-col border-e bg-sidebar transition-[width] duration-200 ease-out hover:w-64 focus-within:w-64 lg:w-64">
      <div className="flex h-16 shrink-0 items-center justify-center gap-3 border-b px-3 group-hover:justify-start lg:justify-start lg:px-4">
        <img
          src="/logo.png"
          alt={t("app.name")}
          className="size-10 shrink-0 rounded-xl object-contain"
        />
        <div className="hidden min-w-0 group-hover:block lg:block">
          <span className="block truncate text-sm font-bold text-foreground">
            {t("app.name")}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {t("app.tagline")}
          </span>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto overscroll-none p-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.id}>
            <p className="hidden px-3 pb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground/60 group-hover:block lg:block">
              {t(section.labelKey)}
            </p>
            <div className="space-y-1">
              {NAV_ITEMS.filter((item) => item.section === section.id).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  title={t(item.labelKey)}
                  className={({ isActive }) =>
                    cn(
                      "relative flex items-center justify-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all group-hover:justify-start lg:justify-start",
                      isActive
                        ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span
                          aria-hidden
                          className="absolute inset-y-1.5 -inset-inline-start-1 w-0.5 rounded-full bg-primary"
                        />
                      )}
                      <item.icon className="size-4 shrink-0" />
                      <span className="hidden truncate group-hover:inline lg:inline">
                        {t(item.labelKey)}
                      </span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t p-2 lg:p-3">
        <div className="flex items-center justify-center gap-2.5 rounded-xl bg-muted/60 px-1 py-2.5 group-hover:justify-start lg:justify-start lg:px-3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
            <ShieldCheck className="size-4" />
          </div>
          <div className="hidden min-w-0 text-[11px] leading-tight group-hover:block lg:block">
            <p className="truncate font-medium text-foreground">{t("app.name")}</p>
            <p className="truncate text-muted-foreground">
              {t("app.localData")} · v{APP_VERSION}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
