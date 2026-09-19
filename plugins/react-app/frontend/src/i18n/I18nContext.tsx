import React, { createContext, useContext, useState, useEffect } from 'react';
import { Locale, Translations } from './types';
import { tr } from './locales/tr';
import { en } from './locales/en';

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  translations: Translations;
}

const translationsMap: Record<Locale, Translations> = {
  tr,
  en,
};

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = 'ofbiz_lang';

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'tr' || saved === 'en') {
        return saved;
      }
      // Tarayıcı dili kontrolü
      const navLang = navigator.language?.toLowerCase() || '';
      return navLang.startsWith('tr') ? 'tr' : 'en';
    } catch {
      return 'tr';
    }
  });

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
      document.documentElement.lang = newLocale;
    } catch (e) {
      console.warn('Could not save language preference:', e);
    }
  };

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const currentTranslations = translationsMap[locale] || translationsMap.tr;

  const t = (path: string, params?: Record<string, string | number>): string => {
    const keys = path.split('.');
    let value: any = currentTranslations;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        // Fallback: diğer dilde kontrol et
        const fallbackTrans = locale === 'tr' ? translationsMap.en : translationsMap.tr;
        let fbVal: any = fallbackTrans;
        for (const fbKey of keys) {
          if (fbVal && typeof fbVal === 'object' && fbKey in fbVal) {
            fbVal = fbVal[fbKey];
          } else {
            fbVal = undefined;
            break;
          }
        }
        value = fbVal !== undefined ? fbVal : path;
        break;
      }
    }

    if (typeof value !== 'string') {
      return path;
    }

    if (params) {
      return Object.entries(params).reduce((str, [paramKey, paramVal]) => {
        return str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
      }, value);
    }

    return value;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, translations: currentTranslations }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
};
