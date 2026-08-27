/* How the app says whether something worked.

   Every consequential action ends here: a green tick that clears itself, or a red cross
   that waits to be acknowledged. Staff recording movements in a corridor need the same
   unmistakable answer every time, and a failure must never be the thing that scrolled
   away while they were looking at the student.

   Screens call alertSuccess/alertWarning/alertError from inside async handlers, so this
   is a plain module rather than a hook — it hands the alert to whichever AlertHost is
   mounted (components/AlertHost.js draws it, inside the theme). Nothing here imports
   React, and a screen never touches the host directly.

   This started out on react-native-sweet-alert. That library's current release calls
   ReactModuleInfo with named arguments, which Kotlin only allows once that class became
   Kotlin in React Native 0.75 — on 0.74 it is a Java class and the build fails. Its last
   pre-codegen release predates AGP 8 and declares no namespace, so it fails too. The
   dialog below is drawn in React Native instead, which also means it follows theme.js
   rather than looking like a stock Android dialog dropped into the app. */

/* Long enough to read four words, short enough not to hold up the next student. */
export const SUCCESS_MS = 1600;

let listener = null;

/* Each alert takes a ticket. A success schedules its own dismissal, and by the time that
   fires the alert on screen may be a later one — showing replaces rather than stacks.
   Only the alert that booked the timer may close it. */
let sequence = 0;

/** Mounted once by AlertHost. Returns an unsubscribe. */
export function subscribeToAlerts(fn) {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
}

function show(alert) {
  const ticket = (sequence += 1);
  /* No host mounted yet — an alert raised during boot has nowhere to go, and losing it
     is better than throwing inside somebody's catch block. */
  if (listener) listener({ ...alert, ticket });
  return ticket;
}

function dismiss(ticket) {
  if (ticket !== sequence) return;
  if (listener) listener(null);
}

/** Closes whatever is open. The host's OK button calls this. */
export function dismissAlert() {
  if (listener) listener(null);
}

/** An ApiError, a plain Error, or anything else that reached a catch block. */
export function messageOf(error) {
  if (!error) return 'Something went wrong.';
  if (typeof error === 'string') return error;
  return error.message || 'Something went wrong.';
}

/**
 * Reports an action that worked. Clears itself after SUCCESS_MS — nothing to tap.
 */
export function alertSuccess(title, message) {
  const ticket = show({ tone: 'success', title: String(title || 'Done'), message: message ? String(message) : '' });
  setTimeout(() => dismiss(ticket), SUCCESS_MS);
}

/**
 * Reports an action that did nothing because it had already been done. Neither a tick nor
 * a cross would be true — "already served today" is not a failure, and a green tick would
 * suggest a second helping was recorded.
 */
export function alertWarning(title, message) {
  const ticket = show({ tone: 'warning', title: String(title || 'Nothing to do'), message: message ? String(message) : '' });
  setTimeout(() => dismiss(ticket), SUCCESS_MS);
}

/**
 * Reports an action that did not work, and waits: an error nobody acknowledged is an
 * error nobody saw. `error` is whatever the catch block caught.
 */
export function alertError(title, error) {
  show({ tone: 'error', title: String(title || 'Failed'), message: messageOf(error), wait: true });
}

export default { alertSuccess, alertWarning, alertError, messageOf, subscribeToAlerts, dismissAlert };
