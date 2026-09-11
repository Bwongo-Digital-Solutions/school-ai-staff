/* Extensions spelled out, unlike the rest of the app. Metro resolves either way; plain Node does
   not, and `scripts/check-locales.mjs` runs this module outside Metro. */
import { en } from './locales/en.js';
import { fr } from './locales/fr.js';

/**
 * Looking a message up: plurals, placeholders, and falling back to English.
 *
 * Separate from the provider in `i18n.js` because this half is pure — no React, no JSX, no storage
 * — which is what lets `scripts/check-locales.mjs` import and run it. Same split as the web app's
 * `i18n/core.ts` beside its `language-provider.tsx`.
 *
 * Hand-written rather than i18next for the reason `format.js` already gives: Hermes ships without
 * full `Intl`, so anything leaning on it for French would need a polyfill in the APK. Two locales
 * whose plural rules are both two-form need about sixty lines.
 */

export const LANG_KEY = 'kps.lang';

export const LANGUAGES = ['en', 'fr'];

/** What each language calls itself. A language list you cannot read is no use. */
export const LANGUAGE_LABELS = { en: 'English', fr: 'Français' };

/**
 * Which form a count takes.
 *
 * English: one is one, everything else including zero is plural. French: zero and one are both
 * singular. That single disagreement is why counted messages are written as a pair.
 */
const plural = (locale, count) => {
  const n = Math.abs(Number(count) || 0);
  if (locale === 'fr') return n < 2 ? 'one' : 'other';
  return n === 1 ? 'one' : 'other';
};

/** `{name}` → vars.name. An unknown placeholder is left as written, so it shows rather than blanks. */
const fill = (text, vars) => {
  if (!vars) return text;
  return String(text).replace(/\{(\w+)\}/g, (whole, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole,
  );
};

/**
 * Looks a message up, falling back to English.
 *
 * The fallback is what lets this ship a screen at a time: a key with no French yet renders its
 * English, so a half-translated app is an English app with French where French exists — never a
 * blank button, and never `home.title` on somebody's phone.
 */
export const translate = (locale, key, vars) => {
  const catalogue = locale === 'fr' ? fr : {};
  const message = catalogue[key] !== undefined ? catalogue[key] : en[key];

  if (message === undefined) {
    if (__DEV__) console.warn(`[i18n] no message for "${key}"`);
    return key;
  }

  if (typeof message === 'string') return fill(message, vars);

  const count = vars && vars.count != null ? vars.count : 0;
  return fill(message[plural(locale, count)], vars);
};
