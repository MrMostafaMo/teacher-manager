import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Ban, CalendarCheck, Pencil, Trash2, Undo2 } from "lucide-react";
import { ContextMenu } from "radix-ui";
import { cn } from "@/lib/utils";
import type { SessionMenuItem } from "./session-menu-items";

const ITEM_ICON: Record<SessionMenuItem, typeof Pencil> = {
  attend: CalendarCheck,
  occurrence: Ban,
  edit: Pencil,
  delete: Trash2,
  restore: Undo2,
  restoreMoved: Undo2,
};

/** Right-click menu mirroring a session block/card's hover actions. */
export function SessionContextMenu({
  items,
  oneOff = false,
  onItem,
  children,
}: {
  items: SessionMenuItem[];
  /** One-off delete wording («حذف الحصة الإضافية») instead of the weekly one. */
  oneOff?: boolean;
  onItem: (item: SessionMenuItem) => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  function label(item: SessionMenuItem): string {
    switch (item) {
      case "attend":
        return t("schedule.attend");
      case "occurrence":
        return t("schedule.exceptions.cancelForDay");
      case "edit":
        return t("schedule.edit");
      case "delete":
        return oneOff ? t("schedule.oneOff.delete") : t("schedule.delete");
      case "restore":
        return t("schedule.exceptions.restore");
      case "restoreMoved":
        return t("schedule.oneOff.restoreMoved");
    }
  }

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          className={cn(
            "z-50 min-w-40 overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground",
            "shadow-(--popover-shadow) ring-1 ring-foreground/10",
          )}
        >
          {items.map((item) => {
            const Icon = ITEM_ICON[item];
            return (
              <ContextMenu.Item
                key={item}
                onSelect={() => onItem(item)}
                className={cn(
                  "relative flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm",
                  "outline-hidden select-none focus:bg-accent focus:text-accent-foreground",
                  item === "delete" &&
                    "text-destructive focus:bg-destructive/10 focus:text-destructive",
                  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                )}
              >
                <Icon />
                {label(item)}
              </ContextMenu.Item>
            );
          })}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
