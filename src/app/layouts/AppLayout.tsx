import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { Header } from "@/app/layouts/Header";
import { Sidebar } from "@/app/layouts/Sidebar";
import { CommandPalette } from "@/shared/CommandPalette";
import { GlobalDialogs, DATA_CHANGED_EVENT } from "@/shared/GlobalDialogs";
import { ToastViewport } from "@/shared/ToastViewport";
import { ShortcutsOverlay } from "@/shared/ShortcutsOverlay";
import { NotificationSync } from "@/features/notifications/ui/notification-sync";
import { SyncManager } from "@/features/sync/ui/sync-events";
import { useCommandStore } from "@/lib/command-store";
import { useShortcuts } from "@/lib/shortcuts/use-shortcuts";

export function AppLayout() {
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const setCommandOpen = useCommandStore((s) => s.setOpen);
  const [dataVersion, setDataVersion] = useState(0);
  const [prevPath, setPrevPath] = useState<string | null>(null);

  useShortcuts();

  // Only animate the page entrance on route changes; global-dialog saves
  // remount via dataVersion without replaying the slide-in.
  useEffect(() => {
    setPrevPath(pathname);
  }, [pathname]);
  const animateEntrance = prevPath !== pathname;

  useLayoutEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  // Remount the routed page when a global dialog saves, so it re-fetches.
  useLayoutEffect(() => {
    const onDataChanged = () => setDataVersion((v) => v + 1);
    window.addEventListener(DATA_CHANGED_EVENT, onDataChanged);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, onDataChanged);
  }, []);

  useLayoutEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setCommandOpen]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main ref={mainRef} className="flex-1 overflow-y-auto overscroll-none p-4 sm:p-6 xl:p-8">
          <div
            key={`${pathname}:${dataVersion}`}
            className={
              animateEntrance
                ? "mx-auto max-w-[1720px] animate-in fade-in-0 slide-in-from-bottom-2 duration-500 ease-out fill-mode-both"
                : "mx-auto max-w-[1720px]"
            }
          >
            <Outlet />
          </div>
        </main>
      </div>
      <CommandPalette />
      <ShortcutsOverlay />
      <GlobalDialogs />
      <NotificationSync />
      <SyncManager />
      <ToastViewport />
    </div>
  );
}
