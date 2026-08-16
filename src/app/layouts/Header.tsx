import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import { CalendarDays, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS, NAV_SECTIONS } from "@/app/navigation";
import { useCommandStore } from "@/lib/command-store";
import { formatDate } from "@/lib/utils/format";
import { NotificationDropdown } from "@/features/notifications/ui/notification-dropdown";
import { SyncStatusBadge } from "@/features/sync/ui/SyncStatusBadge";

export function Header() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const setPaletteOpen = useCommandStore((s) => s.setOpen);
  const current =
    NAV_ITEMS.find((item) => item.to !== "/" && pathname.startsWith(item.to)) ??
    NAV_ITEMS.find((item) => item.to === pathname) ??
    NAV_ITEMS[0];
  const Icon = current.icon;
  const section = NAV_SECTIONS.find((s) => s.id === current.section);

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-md sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-4.5" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold leading-tight">
            {t(current.labelKey)}
          </h1>
          <p className="truncate text-xs leading-tight text-muted-foreground">
            {section ? t(section.labelKey) : ""}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <SyncStatusBadge />
        <NotificationDropdown />
        <Button
          variant="outline"
          size="sm"
          aria-label={t("common.commandPalette.title")}
          onClick={() => setPaletteOpen(true)}
          className="h-9 rounded-lg ps-2.5 pe-2 text-xs text-muted-foreground"
        >
          <Search className="size-3.5" />
          <span className="hidden sm:inline">{t("common.search")}</span>
          <kbd className="ms-1 rounded border bg-muted px-1 font-sans text-[10px] leading-4 text-muted-foreground/80">
            Ctrl K
          </kbd>
        </Button>
        <span className="flex shrink-0 items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
          <CalendarDays className="size-3.5" />
          <span className="hidden lg:inline">{formatDate(Date.now(), "dddd")}</span>
          <span dir="ltr">{formatDate(Date.now(), "DD-MM-YYYY")}</span>
        </span>
      </div>
    </header>
  );
}
