/* Whether this phone is running the newest build, and how to get the new one.

   Not a push notification, and deliberately so: there is no Firebase project behind this app and
   no FCM credentials, so nothing can wake a closed app. What it can do is ask every time it is
   opened, which turns out to be enough — a teacher who never opens the app does not need the
   update, and one who does is told within seconds of opening it.

   The server is asked rather than GitHub: it answers for both a school hosting its own APK and a
   school on the public release, it caches across every teacher at the school, and it is reachable
   from a school network that may not reach anything else.

   The comparison itself is in update-core.js, where Node can test it. */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { api } from './api.js';
import { APP_VERSION } from './version.js';
import { isNewer } from './update-core.js';

/** Which version the teacher has already said they do not want to be told about again. */
const DISMISSED_KEY = 'kps.updateDismissed';

/**
 * What the server says is newest, against what is actually installed.
 *
 * Returns null for every uninteresting case — up to date, nothing published, a server that cannot
 * be reached, a version that does not parse — so a caller has one thing to check. An update prompt
 * is the only outcome worth a teacher's attention, and it must never be shown on a guess.
 */
export const checkForUpdate = async () => {
  let offer;
  try {
    offer = await api.appOffer();
  } catch {
    // Offline, or a server mid-restart. Not a thing to report: the teacher did not ask.
    return null;
  }

  const latest = offer && offer.latestVersion;
  if (!latest || !isNewer(latest, APP_VERSION)) return null;

  let dismissed = '';
  try {
    dismissed = (await AsyncStorage.getItem(DISMISSED_KEY)) || '';
  } catch {
    /* storage unavailable — better to prompt again than to stay silent about a real update */
  }
  if (dismissed === String(latest)) return null;

  return {
    version: String(latest),
    notes: String((offer && offer.latestNotes) || ''),
    installed: APP_VERSION,
    /* Where to get it. The Obtainium link is preferred where the phone has it, because it keeps
       the app updated afterwards rather than needing this prompt again next time. */
    apkUrl: String((offer && offer.apkUrl) || ''),
    obtainium: String((offer && offer.obtainium) || ''),
  };
};

/** Remember that this version was waved away, so it is not raised again until the next one. */
export const dismissUpdate = async (version) => {
  try {
    await AsyncStorage.setItem(DISMISSED_KEY, String(version || ''));
  } catch {
    /* storage unavailable — it will be offered again, which is the safe way to be wrong */
  }
};

export default { isNewer, checkForUpdate, dismissUpdate };
