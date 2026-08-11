import { useTranslation } from "react-i18next";
import { ArrowRight, CornerDownLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CommandPaletteItem {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  run: () => void;
}

interface CommandPaletteListProps {
  items: CommandPaletteItem[];
  activeIndex: number;
  onActiveChange: (index: number) => void;
  listRef: React.RefObject<HTMLDivElement | null>;
}

export function CommandPaletteList({
  items,
  activeIndex,
  onActiveChange,
  listRef,
}: CommandPaletteListProps) {
  const { t } = useTranslation();
  return (
    <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
      {items.length === 0 ? (
        <p className="px-3 py-8 text-center text-sm text-muted-foreground">
          {t("common.commandPalette.noResults")}
        </p>
      ) : (
        <ul className="space-y-0.5">
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  data-index={index}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start text-sm outline-none",
                    index === activeIndex
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted/60",
                  )}
                  onMouseEnter={() => onActiveChange(index)}
                  onClick={() => item.run()}
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 font-medium">{item.label}</span>
                  {item.hint && (
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {item.hint}
                    </span>
                  )}
                  {index === activeIndex && (
                    <CornerDownLeft className="size-3.5 text-muted-foreground" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex items-center justify-between px-3 pb-1 pt-2 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <ArrowRight className="size-3 rtl:rotate-180" />
          {t("common.commandPalette.enterToGo")}
        </span>
        <span>{t("common.commandPalette.navigate")}</span>
      </div>
    </div>
  );
}
