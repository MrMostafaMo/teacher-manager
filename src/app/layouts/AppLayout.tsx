import { useLayoutEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { Header } from "@/app/layouts/Header";
import { Sidebar } from "@/app/layouts/Sidebar";
import { CommandPalette } from "@/shared/CommandPalette";
import { GlobalDialogs, DATA_CHANGED_EVENT } from "@/shared/GlobalDialogs";
import { ToastViewport } from "@/shared/ToastViewport";
import { useCommandStore } from "@/lib/command-store";

export function AppLayout() {
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const setCommandOpen = useCommandStore((s) => s.setOpen);
  const [dataVersion, setDataVersion] = useState(0);

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
        <main ref={mainRef} className="flex-1 overflow-y-auto overscroll-none p-6">
          <div
            key={`${pathname}:${dataVersion}`}
            className="mx-auto max-w-[1440px] animate-in fade-in-0 slide-in-from-bottom-1 duration-200 ease-out"
          >
            <Outlet />
          </div>
        </main>
      </div>
      <CommandPalette />
      <GlobalDialogs />
      <ToastViewport />
    </div>
  );
}
