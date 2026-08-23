import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Search, User } from "lucide-react";
import { NAV_ITEMS } from "@/app/navigation";
import { useCommandStore } from "@/lib/command-store";
import { useDialogStore } from "@/lib/dialog-store";
import { useShortcutsStore } from "@/lib/shortcuts/shortcuts-store";
import { parseCombo, formatCombo } from "@/lib/shortcuts/combo";
import type { ShortcutActionId } from "@/lib/shortcuts/types";
import { QUICK_ACTIONS } from "./command-palette-actions";
import { CommandPaletteList, type CommandPaletteItem } from "./command-palette-list";
import { useStudentSearch } from "./use-student-search";
import { cycleTabFocus } from "./cycle-tab-focus";

export function CommandPalette() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const open = useCommandStore((s) => s.open);
  const setOpen = useCommandStore((s) => s.setOpen);
  const openDialog = useDialogStore((s) => s.openDialog);
  const shortcuts = useShortcutsStore((s) => s.shortcuts);
  const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const studentMatches = useStudentSearch(open, query);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const items = useMemo<CommandPaletteItem[]>(() => {
    const q = query.trim().toLowerCase();
    const fmt = (id: string) => {
      const c = shortcuts[id as ShortcutActionId];
      return c ? formatCombo(parseCombo(c), isMac) : undefined;
    };
    const nav = NAV_ITEMS.map((item) => ({
      id: `nav:${item.to}`,
      label: t(item.labelKey),
      hint: "",
      icon: item.icon,
      shortcutCombo: fmt(`nav:${item.to}`),
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
      shortcutCombo: fmt(`dialog:${a.id}`) ?? fmt(`action:${a.id}`),
      run: () => {
        setOpen(false);
        if (a.dialog) openDialog(a.dialog);
        else if (a.to) navigate(a.to);
      },
    }));
    const students = studentMatches.map((s) => ({
      id: `student:${s.id}`,
      label: s.name,
      hint: t("commandPalette.student"),
      icon: User,
      run: () => {
        setOpen(false);
        navigate(`/students/${s.id}`);
      },
    }));
    const all = [...nav, ...actions, ...students];
    if (!q) return all;
    return all.filter((n) => n.label.toLowerCase().includes(q));
  }, [query, navigate, setOpen, openDialog, t, shortcuts, isMac, studentMatches]);

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
      if (e.key === "Tab") {
        cycleTabFocus(e, dialogRef.current);
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
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-lg"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("common.commandPalette.title")}
        className="w-full max-w-lg animate-in fade-in-0 zoom-in-95 duration-200 ease-out overflow-hidden rounded-2xl border bg-background shadow-(--popover-shadow)"
      >
        <div className="flex items-center gap-3 border-b px-5 focus-within:bg-muted/30">
          <Search className="size-5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("common.commandPalette.placeholder")}
            aria-label={t("common.commandPalette.placeholder")}
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-activedescendant={`command-palette-option-${activeIndex}`}
            aria-autocomplete="list"
            className="h-12 w-full rounded-md bg-transparent text-base outline-none focus-visible:ring-1 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
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
