import type { Language, TranslationVariables } from './dictionaries/core';
import core from './dictionaries/core';
import navigation from './dictionaries/navigation';
import store from './dictionaries/store';
import orders from './dictionaries/orders';
import products from './dictionaries/products';
import messages from './dictionaries/messages';
import configuration from './dictionaries/configuration';
import warehouse from './dictionaries/warehouse';
import campaigns from './dictionaries/campaigns';
import promotions from './dictionaries/promotions';
import boost from './dictionaries/boost';

/**
 * Merges the per-area dictionaries into the single flat key space consumed by
 * `useLanguage`. English is the source language, so a key missing from the
 * Italian dictionary degrades to English rather than showing the raw key.
 */
function merge(language: Language) {
  return {
    ...core[language],
    ...navigation[language],
    ...store[language],
    ...orders[language],
    ...products[language],
    ...messages[language],
    ...configuration[language],
    ...warehouse[language],
    ...campaigns[language],
    ...promotions[language],
    ...boost[language],
  };
}

export const translations: Record<Language, Record<string, string>> = {
  en: merge('en'),
  it: merge('it'),
};

export type { Language, TranslationVariables };
