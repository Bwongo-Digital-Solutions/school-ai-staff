/* Exercising the date picker's arithmetic, which is the half of it that can be wrong silently.
 *
 *   node scripts/check-dates.mjs
 *
 * Written for the same reason as check-update.mjs: there is no phone in CI and no emulator on a
 * contributor's laptop, but `date-core.js` has no React Native in it, so Node can run the part
 * that actually decides what date gets saved. `npx expo export` proves the app bundles; it proved
 * that for a screen that crashed the moment it rendered, so it is not the check that matters here.
 *
 * Each case below is a way a calendar lies while looking completely normal.
 *
 * One caveat on the timezone case, because it is easy to be falsely reassured by it: the UTC-shift
 * assertion cannot fail in a UTC container. Planting the `new Date(iso)` bug back trips the other
 * assertions but not that one, because in UTC the shift is zero. To exercise it properly, run the
 * script somewhere east or west of Greenwich:
 *
 *   for tz in Africa/Kampala Pacific/Kiritimati Pacific/Midway; do TZ=$tz node scripts/check-dates.mjs; done
 *
 * That sweep passes, which is what makes the parse demonstrably timezone-independent rather than
 * merely untested. The TZ each run used is printed below so a green log says which.
 */

import {
  parseIso,
  toIso,
  daysInMonth,
  leadingBlanks,
  monthGrid,
  yearRange,
} from '../date-core.js';

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

console.log(`\nRunning in TZ=${Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone || process.env.TZ || 'unknown'} (offset ${-new Date().getTimezoneOffset() / 60}h)`);

console.log('\nReading a date:');
check('a real date parses', parseIso('2011-03-14'), { year: 2011, month: 3, day: 14 });
/* The one that matters most. `new Date('2011-03-14').getDate()` is 13 anywhere east of Greenwich,
   which is the bug the web app's old picker shipped: a date chosen in Kampala saved as the day
   before. Nothing about the field looks wrong when it happens. */
check('no UTC shift east of Greenwich', parseIso('2011-03-14').day, 14);
check('a timestamp is tolerated', parseIso('2026-09-16T00:00:00.000Z'), { year: 2026, month: 9, day: 16 });

console.log('\nRefusing a date that does not exist:');
/* `new Date('2011-02-30')` rolls forward to 2 March — it turns a typo into a plausible wrong
   answer rather than into a visibly empty field. */
check('30 February is refused', parseIso('2011-02-30'), null);
check('month 13 is refused', parseIso('2011-13-01'), null);
check('day 0 is refused', parseIso('2011-03-00'), null);
check('nonsense is refused', parseIso('not a date'), null);
check('empty is refused', parseIso(''), null);
check('null is refused', parseIso(null), null);

console.log('\nLeap years:');
check('2024 February has 29 days', daysInMonth(2024, 2), 29);
check('2023 February has 28', daysInMonth(2023, 2), 28);
check('1900 was not a leap year', daysInMonth(1900, 2), 28);
check('2000 was', daysInMonth(2000, 2), 29);
check('29 Feb 2024 parses', parseIso('2024-02-29'), { year: 2024, month: 2, day: 29 });
check('29 Feb 2023 does not', parseIso('2023-02-29'), null);

console.log('\nThe grid starts the week on Monday:');
/* 1 September 2025 was a Monday, so it sits in the first column with no blanks before it. */
check('a month starting Monday has no blanks', leadingBlanks(2025, 9), 0);
/* 1 February 2026 was a Sunday — the last column. getDay() calls that 0, and a picker that
   believed it would put every date in the month a day out. */
check('a month starting Sunday has six blanks', leadingBlanks(2026, 2), 6);
check('1 March 2026 (a Sunday) likewise', leadingBlanks(2026, 3), 6);

console.log('\nThe grid itself:');
const feb2026 = monthGrid(2026, 2);
check('February 2026 is 6 blanks + 28 days', feb2026.length, 34);
check('its first six cells are blank', feb2026.slice(0, 6), [null, null, null, null, null, null]);
check('the 1st follows them', feb2026[6], 1);
check('and the last cell is the 28th', feb2026[feb2026.length - 1], 28);

console.log('\nWriting a date back:');
check('single digits are padded', toIso(2011, 3, 4), '2011-03-04');
check('a round trip survives', parseIso(toIso(2024, 2, 29)), { year: 2024, month: 2, day: 29 });

console.log('\nThe year dropdown:');
const plain = yearRange({ today: 2026, back: 100, forward: 10, selected: null });
check('a hundred back and ten forward is 111 years', plain.length, 111);
check('newest first', plain[0], 2036);
check('oldest last', plain[plain.length - 1], 1926);
/* A record can hold a date outside the offered range — imported data, or a bound added later. The
   dropdown must still show that record's own year rather than silently displaying a different
   one, which would rewrite the date on the next save. */
const widened = yearRange({ today: 2026, back: 10, forward: 0, selected: 1912 });
check('an out-of-range selection widens the list', widened[widened.length - 1], 1912);
check('bounds are honoured', yearRange({ today: 2026, back: 100, forward: 10, min: 2020, max: 2022 }), [2022, 2021, 2020]);

console.log(
  failures === 0
    ? `\nAll date checks pass.\n`
    : `\n${failures} date check(s) FAILED.\n`,
);
process.exit(failures === 0 ? 0 : 1);
