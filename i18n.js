import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { LANG_KEY, LANGUAGES, LANGUAGE_LABELS, translate } from './i18n-core';
import { en } from './locales/en';
import { fr } from './locales/fr';
import { humanise, setFormatLocale } from './format';

/**
 * Which language the app is in, and the `t` every screen calls.
 *
 * Deliberately the same shape as `ThemeProvider` in theme.js — a key in AsyncStorage, hydrated on
 * mount, a setter that writes back, one context value. Two preferences that behave the same way are
 * two a member of staff only has to learn once, and the switch sits on the Profile tab beside the
 * theme switch, which is the one tab every role can open.
 *
 * The lookup itself lives in `i18n-core.js`, which has no React in it.
 */

export { LANGUAGES, LANGUAGE_LABELS, translate };

const LanguageContext = createContext({
  language: 'en',
  locale: 'en',
  setLanguage: () => {},
  t: (key) => translate('en', key),
  labelOf: (value) => humanise(value),
});

export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(LANG_KEY)
      .then((stored) => {
        if (!cancelled && LANGUAGES.includes(stored)) setLocale(stored);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback((next) => {
    if (!LANGUAGES.includes(next)) return;
    setLocale(next);
    AsyncStorage.setItem(LANG_KEY, next).catch(() => {});
  }, []);

  /* `format.js` is a plain module imported by fifty call sites, none of which could reasonably take
     a locale argument. It reads one module-level value instead, set here during render so it is
     correct before any child renders with it. Setting it in an effect would mean the first paint
     after a language change still carried the old month names. */
  setFormatLocale(locale);

  const value = useMemo(() => {
    const t = (key, vars) => translate(locale, key, vars);
    return {
      language: locale,
      locale,
      setLanguage,
      t,
      /**
       * A value the server sent as an enum, in words.
       *
       * The server stores statuses, meals and movement directions as snake_case, and `humanise`
       * turned them into English prose by swapping underscores for spaces — which cannot be
       * translated at all. This looks the value up first and falls back to `humanise`, so an enum
       * this build has never heard of still reads the way it always did.
       */
      labelOf: (raw) => {
        const key = `enum.${String(raw == null ? '' : raw).trim().toLowerCase()}`;
        const catalogue = locale === 'fr' ? fr : {};
        if (catalogue[key] !== undefined || en[key] !== undefined) return t(key);
        return humanise(raw);
      },
    };
  }, [locale, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useT() {
  return useContext(LanguageContext);
}

export default { LanguageProvider, useT, translate, LANGUAGES, LANGUAGE_LABELS };
