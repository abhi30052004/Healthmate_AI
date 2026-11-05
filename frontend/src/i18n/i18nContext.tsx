import React, { createContext, useContext, useState, useEffect } from "react";
import en from "./en.json";
import bn from "./bn.json";
import hi from "./hi.json";

export type SupportedLanguage = "en" | "bn" | "hi";

type TranslationDict = typeof en;

const translations: Record<SupportedLanguage, any> = {
  en,
  bn,
  hi,
};

interface I18nContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (path: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  language: "en",
  setLanguage: () => {},
  t: (path: string, fallback?: string) => fallback || path,
});

export function I18nProvider({
  children,
  initialLanguage = "en",
}: {
  children: React.ReactNode;
  initialLanguage?: SupportedLanguage;
}) {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("healthmate_language") as SupportedLanguage;
      if (saved && (saved === "en" || saved === "bn" || saved === "hi")) {
        return saved;
      }
    }
    return initialLanguage;
  });

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("healthmate_language", lang);
      document.documentElement.lang = lang;
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const t = (path: string, fallback?: string): string => {
    const keys = path.split(".");
    let current: any = translations[language];

    for (const key of keys) {
      if (current && typeof current === "object" && key in current) {
        current = current[key];
      } else {
        current = undefined;
        break;
      }
    }

    if (typeof current === "string") {
      return current;
    }

    // Fallback to English
    let enFallback: any = translations["en"];
    for (const key of keys) {
      if (enFallback && typeof enFallback === "object" && key in enFallback) {
        enFallback = enFallback[key];
      } else {
        enFallback = undefined;
        break;
      }
    }

    if (typeof enFallback === "string") {
      return enFallback;
    }

    return fallback || path;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { language, setLanguage } = useI18n();

  return (
    <div
      role="group"
      aria-label="Language selection"
      className={`inline-flex items-center gap-1 p-1 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-semibold ${className}`}
    >
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`px-2.5 py-1 rounded-lg transition-colors ${
          language === "en"
            ? "bg-white text-[var(--green-900)] shadow-2xs font-bold"
            : "text-[var(--muted)] hover:text-[var(--text)]"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage("bn")}
        className={`px-2.5 py-1 rounded-lg transition-colors ${
          language === "bn"
            ? "bg-white text-[var(--green-900)] shadow-2xs font-bold"
            : "text-[var(--muted)] hover:text-[var(--text)]"
        }`}
      >
        বাংলা
      </button>
      <button
        type="button"
        onClick={() => setLanguage("hi")}
        className={`px-2.5 py-1 rounded-lg transition-colors ${
          language === "hi"
            ? "bg-white text-[var(--green-900)] shadow-2xs font-bold"
            : "text-[var(--muted)] hover:text-[var(--text)]"
        }`}
      >
        हिन्दी
      </button>
    </div>
  );
}
