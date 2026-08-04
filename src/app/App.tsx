import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { router } from "@/app/routes";
import { applyLanguage } from "@/lib/i18n";
import { useLanguageStore } from "@/lib/i18n/language-store";

/** Routed app shell (Phase 1). Feature routes load lazily. */
export default function App() {
  const language = useLanguageStore((s) => s.language);

  useEffect(() => {
    applyLanguage(language);
  }, [language]);

  return <RouterProvider router={router} />;
}
