/* The audible half of the new-message alert. The visible half is components/AnimatedBell.js.

   Staff carry this phone around a gate or a corridor and are not watching the screen, so
   a message that has arrived keeps asking to be read: a chime when it lands, then a
   reminder every minute until the inbox is opened. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Audio } from 'expo-av';

const REPEAT_MS = 60000;

/* Messages that were already waiting when the app opened do not start the reminder —
   only an arrival seen by this session does. Otherwise signing in with a week of unread
   mail chimes every minute until it is all read. Set this to true for the stricter
   reading of "periodic while unread". */
const ALERT_ON_EXISTING_UNREAD = false;

/* The unread *count* is not a reliable arrival signal: read one message while another
   lands and the count never changes. The newest unread message identifies the arrival. */
function newestUnread(messages) {
  let newest = '';
  (messages || []).forEach((message) => {
    if (message.read) return;
    const stamp = `${message.created_at || ''}|${message.id || ''}`;
    if (stamp > newest) newest = stamp;
  });
  return newest;
}

async function chime(ref) {
  try {
    if (!ref.current) {
      /* Ducking rather than interrupting: a chime should not stop whatever else the
         phone is playing. */
      await Audio.setAudioModeAsync({ shouldDuckAndroid: true, playsInSilentModeIOS: false });
      const { sound } = await Audio.Sound.createAsync(require('./assets/notify.wav'));
      ref.current = sound;
    }
    await ref.current.replayAsync();
  } catch {
    /* A device with no audio route, or audio focus denied, must not break the screen —
       the bell is still animating. */
  }
}

/**
 * Sounds a chime when a message arrives and every REPEAT_MS after that while anything is
 * unread. Silent while the app is backgrounded, and stops the moment the inbox is read.
 */
export function useNewMessageChime(inbox) {
  const sound = useRef(null);
  const seen = useRef(null);
  const [alerting, setAlerting] = useState(false);

  const unread = (inbox && inbox.unread) || 0;
  const signature = useMemo(() => newestUnread(inbox && inbox.messages), [inbox]);

  useEffect(
    () => () => {
      const current = sound.current;
      sound.current = null;
      if (current) current.unloadAsync().catch(() => {});
    },
    [],
  );

  useEffect(() => {
    if (!inbox || !inbox.loaded) return;

    /* The first load establishes what was already waiting, without sounding. */
    if (seen.current === null) {
      seen.current = signature;
      setAlerting(ALERT_ON_EXISTING_UNREAD && unread > 0);
      return;
    }

    if (!unread) {
      seen.current = signature;
      setAlerting(false);
      return;
    }

    if (signature !== seen.current) {
      seen.current = signature;
      setAlerting(true);
      if (AppState.currentState === 'active') chime(sound);
    }
  }, [inbox, signature, unread]);

  useEffect(() => {
    if (!alerting || !unread) return undefined;
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') chime(sound);
    }, REPEAT_MS);
    return () => clearInterval(timer);
  }, [alerting, unread]);
}

export default { useNewMessageChime };
