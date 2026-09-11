import { shimStore } from "@/lib/settings/settings-store";

export const LANGUAGES = [
  { code: "ar", label: "العربية", dir: "rtl" },
  { code: "en", label: "English", dir: "ltr" },
] as const;

export type Language = (typeof LANGUAGES)[number]["code"];
export type Direction = "ltr" | "rtl";

export const STORAGE_KEY = "tm-language";

export interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

/** Compatibility shim over the unified settings store (one release). */
export const useLanguageStore = shimStore<LanguageState>((s) => ({
  language: s.language,
  setLanguage: s.setLanguage,
}));

/**
 * Synchronous read of the persisted language so `dir`/`lang` can be applied
 * before the first render (no RTL/LTR flash). Falls back to Arabic.
 */
export function readInitialLanguage(): Language {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { language?: unknown } };
      const lang = parsed?.state?.language;
      if (lang === "ar" || lang === "en") return lang;
    }
  } catch {
    /* corrupted storage — fall through to default */
  }
  return "ar";
}
