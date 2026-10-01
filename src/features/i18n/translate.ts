import { translations, type Language, type TranslationVariables } from './translations';

let activeLanguage: Language = 'it';

/**
 * Non-React access to the active language.
 *
 * Components read language through `useLanguage()`. Services, hooks and
 * attachment helpers run outside the React tree, so the provider mirrors its
 * state here to let them produce localized messages too.
 */
export function setActiveLanguage(language: Language) {
  activeLanguage = language;
}

export function getActiveLanguage(): Language {
  return activeLanguage;
}

/**
 * Translates outside of React. Prefer `useLanguage().t` inside components; use
 * this only where there is no hook available, such as thrown error messages.
 *
 * English is the source language, so a key missing from the active dictionary
 * degrades to English. An entirely unknown key returns the key itself.
 */
export function translate(key: string, variables: TranslationVariables = {}): string {
  const value = translations[activeLanguage][key] ?? translations.en[key] ?? key;
  return value.replace(/\{(\w+)\}/g, (_match, name: string) =>
    String(variables[name] ?? `{${name}}`),
  );
}
