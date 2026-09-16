/**
 * Work the phone could not send yet.
 *
 * Staff use this app in places with no signal — a gate at the edge of the compound, a classroom
 * with thick walls, a dormitory at night. Until now a write attempted there simply failed: the
 * screen said so, and the work was gone. Nothing was stored and nothing was ever retried, so
 * "register it again when you get back" was the whole recovery procedure.
 *
 * This is the queue that fixes that. A write that cannot reach the server is kept here and sent
 * when the network returns.
 *
 * ## Three things that make this safe rather than merely hopeful
 *
 * **Every entry carries a key, generated once.** A request whose work succeeded and whose reply was
 * lost is indistinguishable, from here, from one that never arrived — so it must be retried, and
 * the retry must not do the work twice. The server remembers the key and replays its original
 * answer (server/services/idempotency.mjs). The key belongs to the entry, not to the attempt: it is
 * generated when the work is queued and never regenerated, or the deduplication is worthless.
 *
 * **Order is kept.** Marks are saved, then a report is sent; a gate pass is granted, then revoked.
 * Replaying those backwards would be worse than not replaying them, so the queue is strictly
 * first-in-first-out and stops at the first entry it cannot send rather than skipping past it.
 *
 * **A refusal is not a network failure.** If the server answers "that class does not exist", the
 * entry is not retryable and must not be retried until the end of time — it is moved aside and
 * shown to the person, who is the only one who can decide what to do about it.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'kps.outbox.v1';

/* Entries that failed for a reason retrying cannot fix. Kept, rather than dropped, because the
   person needs to know their work did not land — silently discarding it would be the same bug this
   file exists to fix, only quieter. */
const REJECTED_KEY = 'kps.outbox.rejected.v1';

/**
 * A key for one queued operation.
 *
 * Not a real UUID: there is no crypto module in this app and adding one would mean a native
 * dependency and a new APK for a string. What is actually needed is that two entries from the same
 * device never collide, and a timestamp with 96 bits of randomness behind it does that comfortably.
 */
const newKey = () => {
  const random = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  return `obx-${Date.now().toString(36)}-${random()}${random()}${random()}`;
};

const listeners = new Set();
let cached = null;

const readQueue = async () => {
  if (cached) return cached;
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    cached = raw ? JSON.parse(raw) : [];
  } catch {
    // Unreadable storage is not a reason to break the app; it is a reason to start from empty.
    cached = [];
  }
  if (!Array.isArray(cached)) cached = [];
  return cached;
};

const writeQueue = async (entries) => {
  cached = entries;
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(entries));
  } catch {
    /* Out of space, or storage denied. The entry stays in memory for this session, which is better
       than nothing and all that can be done from here. */
  }
  listeners.forEach((listener) => {
    try {
      listener(entries.length);
    } catch {
      // A listener that throws must not stop the others, nor the flush that triggered them.
    }
  });
};

/** Tell me how many pieces of work are waiting. Returns an unsubscribe. */
export const onPendingChange = (listener) => {
  listeners.add(listener);
  void readQueue().then((entries) => listener(entries.length));
  return () => listeners.delete(listener);
};

export const pendingCount = async () => (await readQueue()).length;

export const pendingEntries = async () => [...(await readQueue())];

/**
 * Put one piece of work on the queue.
 *
 * `label` is what the person will see in the list of what is waiting, so it says what the work was
 * — "Register Nakato Amina" — rather than naming an endpoint.
 */
export const enqueue = async ({ path, body, label, options }) => {
  const entry = {
    key: newKey(),
    path,
    body,
    // Whatever the first attempt was given — a longer timeout for a whole class of marks, say. The
    // retry needs it as much as the first attempt did.
    options: options || undefined,
    label: label || '',
    queuedAt: new Date().toISOString(),
    attempts: 0,
    lastError: '',
  };
  await writeQueue([...(await readQueue()), entry]);
  return entry;
};

const rejected = async () => {
  try {
    const raw = await AsyncStorage.getItem(REJECTED_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

const reject = async (entry, message) => {
  try {
    await AsyncStorage.setItem(
      REJECTED_KEY,
      JSON.stringify([...(await rejected()), { ...entry, rejectedAt: new Date().toISOString(), lastError: message }]),
    );
  } catch {
    // Nothing further to do; the entry is already out of the queue.
  }
};

export const rejectedEntries = async () => rejected();

export const clearRejected = async () => {
  try {
    await AsyncStorage.removeItem(REJECTED_KEY);
  } catch {
    // Nothing to do.
  }
};

/**
 * Try to send everything waiting, oldest first.
 *
 * `send(entry)` does one attempt and either resolves or throws an ApiError. A thrown error with
 * `status === 0` never reached the server — the queue stops there and keeps its place, because the
 * next entry will not fare better and because order has to hold. Any other status is the server
 * having an opinion, which retrying will not change.
 *
 * Returns what happened, so a caller can tell the person something true.
 */
export const flush = async (send) => {
  const entries = await readQueue();
  if (entries.length === 0) return { sent: 0, rejected: 0, remaining: 0, offline: false };

  let sent = 0;
  let refused = 0;
  let offline = false;
  const remaining = [...entries];

  while (remaining.length > 0) {
    const entry = remaining[0];
    try {
      await send(entry);
      remaining.shift();
      sent += 1;
    } catch (error) {
      const status = Number(error && error.status);
      /* No way through, or no longer signed in. Keep it, and everything behind it, in order.
       *
       * 401 belongs here rather than below, and it is the one refusal the rule below gets wrong:
       * every other status is the server having an opinion about the work, which retrying will not
       * change — but 401 is an opinion about the *session*, and signing in again changes it. It is
       * also routine, because a session lasts twelve hours by default. Discarding here meant a
       * teacher who registered a child at a gate with no signal, and whose session then ran out
       * before the signal returned, lost the registration — which is the exact failure this queue
       * exists to prevent. */
      if (!status || status === 401) {
        entry.attempts += 1;
        entry.lastError = String((error && error.message) || '');
        offline = true;
        break;
      }
      // The server answered and refused. Retrying cannot fix that.
      remaining.shift();
      refused += 1;
      await reject(entry, String((error && error.message) || ''));
    }
  }

  await writeQueue(remaining);
  return { sent, rejected: refused, remaining: remaining.length, offline };
};
