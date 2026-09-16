/* What the outbox does with a refusal, which is the decision that can lose somebody's work.
 *
 *   node scripts/check-outbox.mjs
 *
 * Written for the same reason as check-update.mjs and check-dates.mjs: outbox.js has no React
 * Native in it beyond AsyncStorage, which falls back to memory under Node, so the queue can be
 * driven here with a stub `send`. Nothing else in this repository can exercise it — `expo export`
 * only proves it bundles.
 *
 * The rule under test is the one that decides whether a queued write is kept or thrown away:
 *
 *   status 0    the request never arrived   -> keep, stop, hold the order
 *   status 401  the session ran out         -> keep, stop  (signing in again fixes it)
 *   any other   the server refused the work -> drop, and record it as rejected
 *
 * 401 is the case worth a test of its own. It is routine — a session lasts twelve hours by
 * default — and it used to fall into "any other", so a teacher who registered a child at a gate
 * with no signal and whose session ran out before the signal returned lost the registration. That
 * is the precise failure this queue exists to prevent.
 */

import { enqueue, flush, pendingCount, pendingEntries, rejectedEntries, clearRejected }
  from '../outbox.js';

let failures = 0;

const check = (what, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failures += 1;
    console.log(`  FAIL  ${what}\n        expected ${JSON.stringify(expected)}\n        got      ${JSON.stringify(actual)}`);
  } else {
    console.log(`  ok    ${what}`);
  }
};

/** A clean queue before each case: drain whatever is there, and forget past rejections. */
const reset = async () => {
  await flush(async () => {});
  await clearRejected();
};

const refuse = (status) => async () => {
  const error = new Error(`refused ${status}`);
  error.status = status;
  throw error;
};

const queue = async (...labels) => {
  for (const label of labels) await enqueue({ path: `/${label}`, body: { label }, label });
};

console.log('\nA session that ran out (401) keeps the work:');
await reset();
await queue('register', 'marks', 'message');
let result = await flush(refuse(401));
check('nothing is sent', result.sent, 0);
check('nothing is thrown away', result.rejected, 0);
check('all three are still queued', await pendingCount(), 3);
check('the queue reports itself as blocked', result.offline, true);
check('nothing lands in the rejected pile', (await rejectedEntries()).length, 0);
/* Order is the other half: marks saved then a report sent, a pass granted then revoked. A queue
   that stepped over the blocked entry would send them out of sequence. */
check('order is untouched', (await pendingEntries()).map((e) => e.label), ['register', 'marks', 'message']);

console.log('\nAnd it goes through once the session is back:');
result = await flush(async () => {});
check('all three send', result.sent, 3);
check('the queue is empty', await pendingCount(), 0);

console.log('\nA refusal about the work itself is still dropped:');
for (const status of [400, 403, 409, 422, 500]) {
  await reset();
  await queue('one');
  const outcome = await flush(refuse(status));
  check(`${status} is rejected, not retried for ever`, [outcome.rejected, await pendingCount()], [1, 0]);
}

console.log('\nNo signal at all is still kept:');
await reset();
await queue('one', 'two');
result = await flush(async () => {
  const error = new Error('Network request failed');
  error.status = 0;
  throw error;
});
check('both are kept', [result.rejected, await pendingCount()], [0, 2]);
check('reported as offline', result.offline, true);

await reset();

console.log(
  failures === 0 ? `\nAll outbox checks pass.\n` : `\n${failures} outbox check(s) FAILED.\n`,
);
process.exit(failures === 0 ? 0 : 1);
