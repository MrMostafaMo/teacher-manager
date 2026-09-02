import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { PanelLeftClose, PanelLeftOpen, ShieldCheck } from "lucide-react";
import { APP_VERSION, NAV_ITEMS, NAV_SECTIONS } from "@/app/navigation";
import { Avatar } from "@/shared/Avatar";
import { useTeacherProfile } from "@/features/teacher-profile/application/use-teacher-profile";
import { useSidebarStore } from "@/lib/sidebar-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Sidebar uses the same Nile tokens as cards/header: flat bg-sidebar, rounded-xl, sidebar-accent active.
export function Sidebar() {
  const { t } = useTranslation();
  const { name } = useTeacherProfile();
  const isPinned = useSidebarStore((s) => s.isPinned);
  const togglePinned = useSidebarStore((s) => s.togglePinned);
  return (
    <aside
      className={cn(
        "group z-30 flex w-16 shrink-0 flex-col border-e border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out hover:w-64 focus-within:w-64 lg:hover:w-64 lg:focus-within:w-64",
        isPinned ? "lg:w-64" : "lg:w-16",
      )}
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-3",
          isPinned
            ? "lg:justify-between lg:px-3"
            : "justify-center group-hover:justify-between lg:justify-center lg:group-hover:justify-between",
        )}
      >
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt={t("app.name")} className="size-9 shrink-0 rounded-lg bg-card object-contain ring-1 ring-border" />
          <div
            className={cn(
              "hidden min-w-0 opacity-0 transition-opacity duration-200 group-hover:block group-hover:opacity-100 lg:group-hover:block lg:group-hover:opacity-100",
              isPinned && "lg:block lg:opacity-100",
            )}
          >
            <span className="font-heading block truncate text-sm font-semibold text-foreground">{t("app.name")}</span>
            <span className="block truncate text-[11px] text-muted-foreground">{t("app.tagline")}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={togglePinned}
          aria-label={t(isPinned ? "common.sidebar.unpin" : "common.sidebar.pin")}
          title={t(isPinned ? "common.sidebar.unpin" : "common.sidebar.pin")}
          className={cn(
            "hidden shrink-0 opacity-0 transition-[background-color,color,opacity] duration-200 group-hover:flex group-hover:opacity-100 lg:group-hover:flex lg:group-hover:opacity-100",
            isPinned
              ? "bg-sidebar-accent text-sidebar-accent-foreground lg:flex lg:opacity-100"
              : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:hidden",
          )}
        >
          {isPinned ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
        </Button>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto overscroll-none p-2.5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.id} className="space-y-1.5">
            <p
              className={cn(
                "hidden px-2.5 pb-1 text-[11px] font-medium tracking-wider text-muted-foreground/70 opacity-0 transition-opacity duration-200 group-hover:block group-hover:opacity-100 lg:group-hover:block lg:group-hover:opacity-100",
                isPinned && "lg:block lg:opacity-100",
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
                      "relative flex items-center justify-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-[background-color,color] group-hover:justify-start lg:group-hover:justify-start",
                      isPinned && "lg:justify-start",
                      isActive
                        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span aria-hidden="true" className="absolute inset-y-2 -start-px w-0.5 rounded-full bg-primary" />}
                      <item.icon className="size-4 shrink-0" />
                      <span
                        className={cn(
                          "hidden truncate opacity-0 transition-opacity duration-200 group-hover:inline group-hover:opacity-100 lg:group-hover:inline lg:group-hover:opacity-100",
                          isPinned && "lg:inline lg:opacity-100",
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
      <div className={cn("shrink-0 border-t border-sidebar-border p-2", isPinned ? "lg:p-2.5" : "")}>
        <div
          className={cn(
            "flex items-center justify-center gap-2.5 rounded-xl bg-card px-1 py-2.5 ring-1 ring-foreground/5 shadow-(--card-shadow) group-hover:justify-start lg:group-hover:justify-start",
            isPinned && "lg:justify-start lg:px-3",
          )}
        >
          {name ? <Avatar name={name} className="size-7 text-xs" /> : <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success"><ShieldCheck className="size-4" /></div>}
          <div
            className={cn(
              "hidden min-w-0 text-[11px] leading-tight opacity-0 transition-opacity duration-200 group-hover:block group-hover:opacity-100 lg:group-hover:block lg:group-hover:opacity-100",
              isPinned && "lg:block lg:opacity-100",
            )}
          >
            <p className="truncate font-medium text-foreground">{name ? t("teacher.display", { name }) : t("app.name")}</p>
            <p className="truncate text-muted-foreground">{name ? `v${APP_VERSION}` : `${t("app.localData")} · v${APP_VERSION}`}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
