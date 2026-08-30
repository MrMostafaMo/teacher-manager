import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { ShieldCheck, Pin, PinOff } from "lucide-react";
import { APP_VERSION, NAV_ITEMS, NAV_SECTIONS } from "@/app/navigation";
import { Avatar } from "@/shared/Avatar";
import { useTeacherProfile } from "@/features/teacher-profile/application/use-teacher-profile";
import { useSidebarStore } from "@/lib/sidebar-store";
import { cn } from "@/lib/utils";

/**
 * Sidebar with two modes: full (w-64) at lg+; a compact icon rail (w-16)
 * below lg that expands to w-64 on hover/focus to reveal labels. The rail
 * stays in flow so expanding simply pushes content (RTL-safe, no overlap).
 */
export function Sidebar() {
  const { t } = useTranslation();
  const { name } = useTeacherProfile();
  const isPinned = useSidebarStore((s) => s.isPinned);
  const togglePinned = useSidebarStore((s) => s.togglePinned);

  return (
    <aside
      className={cn(
        "group z-30 flex w-16 shrink-0 flex-col border-e bg-gradient-to-b from-sidebar to-sidebar/95 transition-[width] duration-200 ease-out hover:w-64 focus-within:w-64",
        isPinned ? "lg:w-64" : "lg:w-16"
      )}
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center gap-3 border-b px-3 group-hover:justify-between",
          isPinned ? "lg:justify-between lg:px-4" : "justify-center lg:justify-center"
        )}
      >
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt={t("app.name")}
            className="size-10 shrink-0 rounded-xl object-contain ring-2 ring-primary/20"
          />
          <div
            className={cn(
              "hidden min-w-0 opacity-0 transition-opacity duration-200 group-hover:block group-hover:opacity-100",
              isPinned && "lg:block lg:opacity-100"
            )}
          >
            <span className="block truncate text-sm font-bold text-foreground">{t("app.name")}</span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {t("app.tagline")}
            </span>
          </div>
        </div>
        <button
          onClick={togglePinned}
          aria-label={t("common.sidebar.toggle")}
          className={cn(
            "hidden shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground opacity-0 transition-opacity duration-200 group-hover:block group-hover:opacity-100",
            isPinned && "lg:block lg:opacity-100"
          )}
        >
          {isPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
        </button>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto overscroll-none p-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.id} className="border-b border-border/50 pb-3 last:border-b-0">
            <p
              className={cn(
                "hidden px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 opacity-0 transition-opacity duration-200 group-hover:block group-hover:opacity-100",
                isPinned && "lg:block lg:opacity-100"
              )}
            >
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
                      "relative flex items-center justify-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-[background-color,color,box-shadow,opacity,transform] hover:shadow-[inset_0_0_0_1px_var(--primary/10)] group-hover:justify-start",
                      isPinned && "lg:justify-start",
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
                          aria-hidden="true"
                          className="absolute inset-y-1.5 -start-1 flex items-center ps-0.5"
                        >
                          <span className="size-1.5 rounded-full bg-primary" />
                        </span>
                      )}
                      <item.icon className="size-4 shrink-0" />
                      <span
                        className={cn(
                          "hidden truncate opacity-0 transition-opacity duration-200 group-hover:inline group-hover:opacity-100",
                          isPinned && "lg:inline lg:opacity-100"
                        )}
                      >
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

      <div className={cn("shrink-0 border-t p-2", isPinned ? "lg:p-3" : "")}>
        <div
          className={cn(
            "flex items-center justify-center gap-2.5 rounded-xl bg-muted/60 px-1 py-2.5 group-hover:justify-start",
            isPinned && "lg:justify-start lg:px-3"
          )}
        >
          {name ? (
            <Avatar name={name} className="size-7 text-xs" />
          ) : (
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
              <ShieldCheck className="size-4" />
            </div>
          )}
          <div
            className={cn(
              "hidden min-w-0 text-[11px] leading-tight opacity-0 transition-opacity duration-200 group-hover:block group-hover:opacity-100",
              isPinned && "lg:block lg:opacity-100"
            )}
          >
            <p className="truncate font-medium text-foreground">{name ? t("teacher.display", { name }) : t("app.name")}</p>
            <p className="truncate text-muted-foreground">
              {name ? `v${APP_VERSION}` : `${t("app.localData")} · v${APP_VERSION}`}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
