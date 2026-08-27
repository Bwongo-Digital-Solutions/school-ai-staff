/* What this build of the app calls itself, for the footer and for support calls.

   The values come from the APK rather than from app.json: a phone that has not been
   updated in a term will report what is actually installed on it, which is the whole
   point of asking someone which version they are running. Expo Go has no native build
   of its own, so the config values stand in there. */

import * as Application from 'expo-application';
import Constants from 'expo-constants';

const UNKNOWN = '—';

/** The user-facing version, e.g. "1.0.0" — Android's versionName. */
export const APP_VERSION =
  Application.nativeApplicationVersion || (Constants.expoConfig && Constants.expoConfig.version) || UNKNOWN;

/** The build it was cut from, e.g. "1" — Android's versionCode. */
export const BUILD_NUMBER = Application.nativeBuildVersion || UNKNOWN;

export const VERSION_LABEL = `v${APP_VERSION} (${BUILD_NUMBER})`;

export const POWERED_BY = 'Powered by e-School';

/** One line, as it appears at the foot of the app. */
export const APP_FOOTER = `${POWERED_BY} · ${VERSION_LABEL}`;

export default { APP_VERSION, BUILD_NUMBER, VERSION_LABEL, POWERED_BY, APP_FOOTER };
