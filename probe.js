/* Asking the phone what actually went wrong.

   Every ordinary request goes through fetch, which is right for the app and useless for
   diagnosis: whatwg-fetch, which React Native's fetch is built on, answers every transport
   failure with a hardcoded `new TypeError('Network request failed')`. A certificate Android
   would not trust, a name that would not resolve and a port nothing is listening on all
   arrive as that one sentence, so "cannot reach the server" can never say why.

   React Native's own XMLHttpRequest keeps what fetch throws away. On failure it assigns the
   native error string to the response and marks the request errored; the `response` getter
   then hides it, but `responseText` does not. That is the whole trick here — one request
   made the long way round, so that Server settings can report the reason instead of a
   category.

   Used only by the connection check, where somebody is standing in front of the phone asking
   why it will not connect. It is not a second HTTP client for the app. */

/* Longer than the app's own 15s: this runs when something is already wrong, and a slow
   answer is itself worth telling apart from no answer. */
const PROBE_TIMEOUT = 20000;

/**
 * Makes one GET and reports what happened, never rejecting.
 *
 * Resolves `{ ok, status, reason }` — `reason` carries Android's own words on failure,
 * which is the point.
 */
export function probeServer(base, path = '/api/health', { timeout = PROBE_TIMEOUT } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    let xhr;
    try {
      xhr = new XMLHttpRequest();
    } catch {
      finish({ ok: false, status: 0, reason: 'This phone could not start a network request.' });
      return;
    }

    /* Reading responseText throws unless responseType is '' or 'text'. It is '' by default
       and left alone deliberately — changing it would hide the very string being read. */
    const detail = () => {
      try {
        return String(xhr.responseText || '').trim();
      } catch {
        return '';
      }
    };

    xhr.onload = () =>
      finish({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, reason: '' });

    xhr.onerror = () =>
      finish({
        ok: false,
        status: 0,
        reason: detail() || 'The request failed and the phone gave no reason.',
      });

    xhr.ontimeout = () =>
      finish({
        ok: false,
        status: 0,
        reason: `No answer within ${Math.round(timeout / 1000)} seconds.`,
      });

    try {
      xhr.open('GET', `${base}${path}`);
      xhr.timeout = timeout;
      xhr.send();
    } catch (err) {
      finish({ ok: false, status: 0, reason: (err && err.message) || 'The address could not be used.' });
    }
  });
}

/* Android's wording is exact but not friendly. These translate the ones worth recognising and
   keep the original alongside, because the original is what identifies the fault to anyone
   who has to fix the server. */
const SIGNATURES = [
  [/trust anchor|certpathvalidator|certificate.*(chain|path)/i,
    'the certificate could not be verified. The server is probably sending its own certificate without the intermediate one — browsers fetch the missing piece themselves, Android does not.'],
  [/sslhandshake|ssl.*handshake|handshake/i,
    'the secure connection could not be negotiated.'],
  [/sslpeerunverified|hostname.*not verified|peer not authenticated/i,
    'the certificate does not match this address.'],
  [/unable to resolve host|nodename nor servname|no address associated/i,
    'the address could not be looked up on this network.'],
  [/failed to connect|econnrefused|connection refused/i,
    'nothing accepted a connection on that port.'],
  [/cleartext/i,
    'Android blocked it for being unencrypted.'],
];

/** One sentence, for a dialog that has to stay small. */
export function summariseProbe(result) {
  if (!result || result.ok) return '';
  const reason = String(result.reason || '').trim();

  if (result.status) return `The server answered ${result.status}.`;
  if (!reason) return 'The request failed and the phone gave no reason.';

  const match = SIGNATURES.find(([pattern]) => pattern.test(reason));
  return match ? match[1] : reason;
}

/**
 * The sentence plus the phone's own words. The raw string is what identifies the fault to
 * whoever fixes the server, so it is kept verbatim rather than tidied away — but only on the
 * settings screen, where there is room to read it.
 */
export function explainProbe(result) {
  const summary = summariseProbe(result);
  if (!summary) return '';
  const reason = String((result && result.reason) || '').trim();
  return reason && reason !== summary ? `${summary}\n\n${reason}` : summary;
}

export default { probeServer, explainProbe, summariseProbe };
