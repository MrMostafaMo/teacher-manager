import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/app/App";
import { ErrorBoundary } from "@/shared/ErrorBoundary";
import "@/lib/i18n";
import { applyLanguage } from "@/lib/i18n";
import { bootstrapDatabase } from "@/lib/db/bootstrap";
import { readInitialLanguage } from "@/lib/i18n/language-store";
import {
  applyTheme,
  readInitialCustomPrimary,
  readInitialPreset,
  readInitialTheme,
} from "@/lib/theme/theme-store";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import "@/styles/globals.css";

// Apply persisted language/theme (mode + preset + custom) before first paint — no flash.
applyLanguage(readInitialLanguage());
applyTheme(readInitialTheme(), readInitialPreset(), readInitialCustomPrimary());

// Disable native WebKit context menu (right-click) — keep it only inside
// editable fields where copy/paste is useful.
document.addEventListener("contextmenu", (e) => {
  const target = e.target as HTMLElement | null;
  if (target?.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']")) return;
  e.preventDefault();
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("[unhandledrejection]", event.reason);
});
window.addEventListener("error", (event) => {
  console.error("[window error]", event.error ?? event.message);
});

void bootstrapDatabase();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
