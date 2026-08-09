import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  CalendarCheck,
  ClipboardList,
  CornerDownLeft,
  NotebookPen,
  Plus,
  Receipt,
  Search,
  Target,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NAV_ITEMS } from "@/app/navigation";
import { useCommandStore } from "@/lib/command-store";
import { useDialogStore, type GlobalDialogId } from "@/lib/dialog-store";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  /** Opens a global create dialog. */
  dialog?: GlobalDialogId;
  /** Navigates instead (e.g. attendance has no create dialog). */
  to?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: "add-student", labelKey: "students.add", icon: UserPlus, dialog: "student" },
  { id: "record-payment", labelKey: "payments.record", icon: Wallet, dialog: "payment" },
  { id: "add-expense", labelKey: "expenses.record", icon: Receipt, dialog: "expense" },
  { id: "add-group", labelKey: "groups.add", icon: Users, dialog: "group" },
  { id: "add-session", labelKey: "schedule.add", icon: Plus, dialog: "schedule" },
  { id: "add-homework", labelKey: "homework.add", icon: NotebookPen, dialog: "homework" },
  { id: "add-exam", labelKey: "exams.add", icon: ClipboardList, dialog: "exam" },
  { id: "add-skill", labelKey: "skills.add", icon: Target, dialog: "skill" },
  { id: "mark-attendance", labelKey: "dashboard.quick.attendance", icon: CalendarCheck, to: "/attendance" },
];

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

  const items = useMemo(() => {
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
                      onMouseEnter={() => setActiveIndex(index)}
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
      </div>
    </div>
  );
}
