'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import en from '@/lib/locales/en.json';
import ru from '@/lib/locales/ru.json';

export const DEFAULT_LOCALE = 'en' as const;
export const FALLBACK_LOCALE = 'en' as const;
export const LOCALE_STORAGE_KEY = 'flow.locale';

const dictionaries = { en, ru } as const;

export type Locale = keyof typeof dictionaries;
type DictionaryValue = string | Record<string, unknown>;

interface I18nContextValue {
  locale: Locale;
  setLocale: (nextLocale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const getByPath = (dictionary: Record<string, unknown>, key: string): DictionaryValue | null => {
  const value = key.split('.').reduce<unknown>((acc, segment) => {
    if (!acc || typeof acc !== 'object' || !(segment in acc)) {
      return null;
    }
    return (acc as Record<string, unknown>)[segment];
  }, dictionary);

  if (typeof value === 'string' || (value && typeof value === 'object')) {
    return value as DictionaryValue;
  }

  return null;
};

const interpolate = (template: string, params?: Record<string, string | number>): string => {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, token: string) => String(params[token] ?? `{${token}}`));
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (storedLocale === 'en' || storedLocale === 'ru') {
      setLocaleState(storedLocale);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const localizedValue = getByPath(dictionaries[locale] as Record<string, unknown>, key);
    if (typeof localizedValue === 'string') {
      return interpolate(localizedValue, params);
    }

    const fallbackValue = getByPath(dictionaries[FALLBACK_LOCALE] as Record<string, unknown>, key);
    if (typeof fallbackValue === 'string') {
      return interpolate(fallbackValue, params);
    }

    return key;
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used inside I18nProvider');
  }
  return context;
}
