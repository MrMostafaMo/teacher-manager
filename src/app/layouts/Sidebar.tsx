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
    <aside className="group z-30 flex w-16 shrink-0 flex-col border-e bg-gradient-to-b from-sidebar to-sidebar/95 transition-[width] duration-200 ease-out hover:w-64 focus-within:w-64 lg:w-64">
      <div className="flex h-16 shrink-0 items-center justify-center gap-3 border-b px-3 group-hover:justify-start lg:justify-start lg:px-4">
        <img
          src="/logo.png"
          alt={t("app.name")}
          className="size-10 shrink-0 rounded-xl object-contain ring-2 ring-primary/20"
        />
        <div className="hidden min-w-0 opacity-0 transition-opacity duration-200 group-hover:block group-hover:opacity-100 lg:block lg:opacity-100">
          <span className="block truncate text-sm font-bold text-foreground">{t("app.name")}</span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {t("app.tagline")}
          </span>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto overscroll-none p-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.id} className="border-b border-border/50 pb-3 last:border-b-0">
            <p className="hidden px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 opacity-0 transition-opacity duration-200 group-hover:block group-hover:opacity-100 lg:block lg:opacity-100">
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
                      "relative flex items-center justify-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all hover:shadow-[inset_0_0_0_1px_var(--primary/10)] group-hover:justify-start lg:justify-start",
                      isActive
                        ? "bg-primary/15 font-semibold text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span
                          aria-hidden
                          className="absolute inset-y-1.5 -inset-inline-start-1 flex items-center ps-0.5"
                        >
                          <span className="size-1.5 rounded-full bg-primary" />
                        </span>
                      )}
                      <item.icon className="size-4 shrink-0" />
                      <span className="hidden truncate opacity-0 transition-opacity duration-200 group-hover:inline group-hover:opacity-100 lg:inline lg:opacity-100">
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
          <div className="hidden min-w-0 text-[11px] leading-tight opacity-0 transition-opacity duration-200 group-hover:block group-hover:opacity-100 lg:block lg:opacity-100">
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
