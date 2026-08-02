import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/app/App";
import "@/lib/i18n";
import { applyLanguage } from "@/lib/i18n";
import { readInitialLanguage } from "@/lib/i18n/language-store";
import { applyTheme, readInitialTheme } from "@/lib/theme/theme-store";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import "@/styles/globals.css";

// Apply persisted language/theme before first paint (no RTL/LTR or flash).
applyLanguage(readInitialLanguage());
applyTheme(readInitialTheme());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
