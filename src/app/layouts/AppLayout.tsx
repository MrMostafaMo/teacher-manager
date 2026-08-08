import { useLayoutEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router";
import { Header } from "@/app/layouts/Header";
import { Sidebar } from "@/app/layouts/Sidebar";

export function AppLayout() {
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main ref={mainRef} className="flex-1 overflow-y-auto overscroll-none p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
