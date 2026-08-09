import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { ShieldCheck } from "lucide-react";
import { APP_VERSION, NAV_ITEMS, NAV_SECTIONS } from "@/app/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { t } = useTranslation();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-e bg-sidebar">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b px-3.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--primary),var(--primary-strong))] shadow-(--card-shadow) ring-1 ring-white/20">
          <img
            src="/logo.png"
            alt={t("app.name")}
            className="size-5 shrink-0 object-contain invert brightness-[1.05]"
          />
        </div>
        <div className="min-w-0">
          <span className="block truncate text-sm font-bold text-foreground">
            {t("app.name")}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {t("app.tagline")}
          </span>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto overscroll-none p-2.5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.id}>
            <p className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground/60">
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
                      "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all",
                      isActive
                        ? "bg-[linear-gradient(90deg,var(--primary),var(--primary-strong))] font-semibold text-primary-foreground shadow-(--card-shadow)"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span
                          aria-hidden
                          className="absolute inset-y-1.5 inset-inline-start-0 w-0.5 rounded-full bg-white/70"
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

      <div className="shrink-0 border-t p-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-muted/60 px-2.5 py-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-success/15 text-success">
            <ShieldCheck className="size-4" />
          </div>
          <div className="min-w-0 text-[11px] leading-tight">
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
