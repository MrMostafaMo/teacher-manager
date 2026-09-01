import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Minus, Square, Copy, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function TitleBar() {
  const { t } = useTranslation();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const win = (() => {
      try {
        return getCurrentWindow();
      } catch {
        return null;
      }
    })();
    if (!win) return;
    win.isMaximized().then(setIsMaximized).catch(() => {});
  }, []);

  const minimize = async () => {
    try {
      await getCurrentWindow().minimize();
    } catch {
      void 0;
    }
  };
  const toggleMaximize = async () => {
    try {
      const win = getCurrentWindow();
      const max = await win.isMaximized();
      if (max) await win.unmaximize();
      else await win.maximize();
      setIsMaximized(!max);
    } catch {
      void 0;
    }
  };
  const close = async () => {
    try {
      await getCurrentWindow().close();
    } catch {
      void 0;
    }
  };

  const onDoubleClick = async (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    await toggleMaximize();
  };

  return (
    <div
      data-tauri-drag-region
      onDoubleClick={onDoubleClick}
      className="flex h-9 shrink-0 select-none items-center justify-between border-b border-sidebar-border bg-sidebar px-3"
      // Keep drag region LTR for window controls consistency, but respect RTL for app name via logical flex
      dir="ltr"
    >
      <div data-tauri-drag-region className="flex min-w-0 items-center gap-2">
        <img src="/logo.png" alt="" className="size-5 shrink-0 rounded object-contain" />
        <span
          data-tauri-drag-region
          className="truncate text-xs font-semibold text-sidebar-foreground"
          dir={document.documentElement.dir || "rtl"}
        >
          {t("app.name")}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={minimize}
          aria-label="تصغير"
          title="تصغير"
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Minus className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={toggleMaximize}
          aria-label={isMaximized ? "استعادة" : "تكبير"}
          title={isMaximized ? "استعادة" : "تكبير"}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {isMaximized ? <Copy className="size-3.5" /> : <Square className="size-3.5" />}
        </button>
        <button
          type="button"
          onClick={close}
          aria-label="إغلاق"
          title="إغلاق"
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
