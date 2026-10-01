import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { translations, type Language, type TranslationVariables } from './translations';
import { setActiveLanguage } from './translate';

const STORAGE_KEY = 'opm-seller-language-v1';

/**
 * Language preference storage. The choice is not a credential, so it follows
 * the same persistence strategy AuthContext uses: encrypted device storage on
 * mobile, local storage on web where SecureStore is unavailable.
 */
const languageStorage = {
  get: async () => (Platform.OS === 'web'
    ? globalThis.localStorage?.getItem(STORAGE_KEY) ?? null
    : await SecureStore.getItemAsync(STORAGE_KEY)),
  set: async (value: string) => {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(STORAGE_KEY, value);
    else await SecureStore.setItemAsync(STORAGE_KEY, value);
  },
};

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, variables?: TranslationVariables) => string;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: PropsWithChildren) {
  // Italian is the default on first launch. A previously saved preference from
  // languageStorage still wins, so this only affects a fresh install.
  const [language, setLanguageState] = useState<Language>('it');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    languageStorage.get()
      .then((saved) => {
        if (active && (saved === 'en' || saved === 'it')) setLanguageState(saved);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    // Mirror the active language so services and hooks outside the React tree
    // can localize their own messages too.
    setActiveLanguage(language);
  }, [language]);

  useEffect(() => {
    // Avoid an unnecessary write on the first render before the saved
    // preference has been read back.
    if (!ready) return;
    void languageStorage.set(language);
  }, [language, ready]);

  const setLanguage = useCallback((next: Language) => setLanguageState(next), []);
  const toggleLanguage = useCallback(
    () => setLanguageState((current) => (current === 'en' ? 'it' : 'en')),
    [],
  );

  const t = useCallback(
    (key: string, variables: TranslationVariables = {}) => {
      // English is the source language, so a key missing from the Italian
      // dictionary degrades to the English copy rather than showing the raw
      // key. An entirely unknown key returns the key itself.
      const value = translations[language][key] ?? translations.en[key] ?? key;
      return value.replace(/\{(\w+)\}/g, (_match, name: string) =>
        String(variables[name] ?? `{${name}}`),
      );
    },
    [language],
  );

  const value = useMemo(
    () => ({ language, setLanguage, toggleLanguage, t }),
    [language, setLanguage, toggleLanguage, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
}

export type { Language };
