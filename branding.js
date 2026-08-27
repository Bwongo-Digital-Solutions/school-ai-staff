/* The school's own identity — its name, tagline and logo — as set by an administrator
   in the web app under Settings -> Branding. Nothing here is hardcoded to one school:
   the app carries a neutral default and wears whatever the server it is pointed at
   tells it to wear.

   Mirrors ThemeProvider in theme.js: a context hydrated once from AsyncStorage so the
   sign-in screen paints the right name before any request completes, then refreshed
   from the server. The cache is what makes the app usable on a slow gate connection
   and correct while offline. */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { schoolApi } from './api';

const CACHE_KEY = 'kps.branding';

/* Matches the fallback in the backend's own loadSchoolSettings(), so the app header and
   a report card generated from the same database never disagree about the school. */
export const DEFAULT_NAME = 'eSchool';

const DEFAULT_LOGO = require('./assets/icon.png');

/* A logo is a data URL and may run to 2MB. AsyncStorage on Android is one SQLite row per
   key and rejects very large values, which would throw away the name and tagline along
   with it, so an oversized logo is simply not cached — it is refetched instead. */
const MAX_CACHED_LOGO = 256 * 1024;

const trimmed = (value) => String(value == null ? '' : value).trim();

/* The settings row is returned raw from the database, and a school that has never opened
   the branding screen has an empty name rather than a missing one. Empty means unset. */
function normalise(settings) {
  const logo = trimmed(settings && settings.logo);
  return {
    name: trimmed(settings && settings.school_name) || DEFAULT_NAME,
    tagline: trimmed(settings && settings.tagline),
    logo,
  };
}

/* Consumers render `logo` straight into <Image source={...}> without branching: it is
   either the admin's uploaded data URL or the icon shipped with the app. */
const asSource = (logo) => (logo ? { uri: logo } : DEFAULT_LOGO);

const EMPTY = { name: DEFAULT_NAME, tagline: '', logo: '' };

const BrandingContext = createContext({
  name: DEFAULT_NAME,
  tagline: '',
  logo: DEFAULT_LOGO,
  isDefaultLogo: true,
  loaded: false,
  refresh: async () => {},
});

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const cancelled = useRef(false);
  /* The cache read and the first server refresh are started together, so the cache can
     resolve second and would otherwise overwrite fresher branding with older. */
  const fromServer = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        if (cancelled.current || fromServer.current || !raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') setBranding({ ...EMPTY, ...normalise(parsed) });
      })
      .catch(() => {
        /* no cache, or unreadable — the defaults already apply */
      });
    return () => {
      cancelled.current = true;
    };
  }, []);

  /* Never rejects. Branding is decoration: a server that is unreachable, or an old
     build with no settings endpoint, must leave the app on its last known identity
     rather than failing a screen. */
  const refresh = useCallback(async () => {
    try {
      const settings = await schoolApi.schoolSettings();
      if (cancelled.current || !settings) return;
      const next = normalise(settings);
      fromServer.current = true;
      setBranding(next);
      setLoaded(true);
      const cacheable = next.logo.length <= MAX_CACHED_LOGO ? next : { ...next, logo: '' };
      AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          school_name: cacheable.name,
          tagline: cacheable.tagline,
          logo: cacheable.logo,
        }),
      ).catch(() => {});
    } catch {
      /* keep whatever is on screen */
    }
  }, []);

  const value = useMemo(
    () => ({
      name: branding.name,
      tagline: branding.tagline,
      logo: asSource(branding.logo),
      isDefaultLogo: !branding.logo,
      loaded,
      refresh,
    }),
    [branding, loaded, refresh],
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}

export default { BrandingProvider, useBranding, DEFAULT_NAME };
