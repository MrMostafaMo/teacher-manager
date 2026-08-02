import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import dayjs from "dayjs";
import "dayjs/locale/ar";
import "dayjs/locale/en";
import { en } from "@/lib/i18n/en";
import { ar } from "@/lib/i18n/ar";
import type { Direction, Language } from "@/lib/i18n/language-store";

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: "ar",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnNull: false,
});

/**
 * Applies a language to the whole document: html[dir], html[lang] and the
 * dayjs locale. Call after a persisted language is restored and whenever the
 * user switches language.
 */
export function applyLanguage(language: Language): Direction {
  const direction: Direction = language === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = language;
  document.documentElement.dir = direction;
  dayjs.locale(language);
  if (i18n.resolvedLanguage !== language) {
    void i18n.changeLanguage(language);
  }
  return direction;
}

export default i18n;
