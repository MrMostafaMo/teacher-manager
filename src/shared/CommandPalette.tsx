import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { NAV_ITEMS } from "@/app/navigation";
import { useCommandStore } from "@/lib/command-store";
import { useDialogStore } from "@/lib/dialog-store";
import { QUICK_ACTIONS } from "./command-palette-actions";
import { CommandPaletteList, type CommandPaletteItem } from "./command-palette-list";

export function CommandPalette() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const open = useCommandStore((s) => s.open);
  const setOpen = useCommandStore((s) => s.setOpen);
  const openDialog = useDialogStore((s) => s.openDialog);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const items = useMemo<CommandPaletteItem[]>(() => {
    const q = query.trim().toLowerCase();
    const nav = NAV_ITEMS.map((item) => ({
      id: `nav:${item.to}`,
      label: t(item.labelKey),
      hint: "",
      icon: item.icon,
      run: () => {
        setOpen(false);
        navigate(item.to);
      },
    }));
    const actions = QUICK_ACTIONS.map((a) => ({
      id: `action:${a.id}`,
      label: t(a.labelKey),
      hint: "+",
      icon: a.icon,
      run: () => {
        setOpen(false);
        if (a.dialog) openDialog(a.dialog);
        else if (a.to) navigate(a.to);
      },
    }));
    const all = [...nav, ...actions];
    if (!q) return all;
    return all.filter((n) => n.label.toLowerCase().includes(q));
  }, [query, navigate, setOpen, openDialog, t]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (activeIndex >= items.length) setActiveIndex(0);
  }, [activeIndex, items.length]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      // No results — arrow keys must not push activeIndex to NaN (% 0).
      if (items.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % items.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + items.length) % items.length);
      } else if (e.key === "Enter") {
        const item = items[activeIndex];
        if (item) item.run();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, items, activeIndex, setOpen]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("common.commandPalette.title")}
        className="w-full max-w-lg animate-in fade-in-0 zoom-in-95 duration-200 ease-out overflow-hidden rounded-xl border bg-background shadow-popover"
      >
        <div className="flex items-center gap-2 border-b px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("common.commandPalette.placeholder")}
            aria-label={t("common.commandPalette.placeholder")}
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden shrink-0 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
            ESC
          </kbd>
        </div>
        <CommandPaletteList
          items={items}
          activeIndex={activeIndex}
          onActiveChange={setActiveIndex}
          listRef={listRef}
        />
      </div>
    </div>
  );
}
