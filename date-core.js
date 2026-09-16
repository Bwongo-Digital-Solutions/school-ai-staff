/* Calendar arithmetic, and nothing else.

   Split from DateField.js for the same reason update-core.js is split from update.js: this half
   has no React Native in it, so Node can import it and the check script can exercise it. It is
   also the half most likely to be quietly wrong. A picker that renders beautifully and puts the
   1st under the wrong weekday, or accepts the 30th of February, or shifts a day across the date
   line, produces a record that is wrong in a way nobody notices until a report card is printed.

   Imports elsewhere in this app carry explicit .js extensions for the same reason: Node's ESM
   resolver does not guess them, and Metro does not mind them. */

const pad = (n) => String(n).padStart(2, '0');

/** `YYYY-MM-DD` from three numbers. The year is padded too, so year 25 is not written as "25". */
export const toIso = (year, month, day) =>
  `${String(year).padStart(4, '0')}-${pad(month)}-${pad(day)}`;

/**
 * How many days a month has. Day 0 of the next month is the last day of this one, which is also
 * where the leap-year rule comes from for free rather than being restated here.
 */
export const daysInMonth = (year, month) => new Date(year, month, 0).getDate();

/**
 * ISO to `{ year, month, day }`, or null, and never a throw.
 *
 * Deliberately not `new Date(iso)`. That parses a bare `YYYY-MM-DD` as **UTC**, so anywhere east
 * of Greenwich `getDate()` hands back the day before — the same defect the web app's old picker
 * shipped, where a date chosen in Kampala was stored as the previous day. It also rolls
 * `2011-02-30` forward into March rather than refusing it, which turns a typo into a plausible
 * wrong answer.
 *
 * Reading the digits directly avoids both. A date that does not exist reads as no date at all,
 * because a field showing nothing invites a correction and a field showing the 2nd of March does
 * not.
 */
export const parseIso = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').slice(0, 10));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
};

/**
 * Which column the 1st of the month sits in, with the week starting on Monday.
 *
 * `getDay()` counts from Sunday, and both English and French school calendars start on Monday, so
 * Sunday's 0 has to become column 6 rather than column 0. Get this wrong and every date in the
 * grid is offset by a day, which looks entirely normal.
 */
export const leadingBlanks = (year, month) => (new Date(year, month - 1, 1).getDay() + 6) % 7;

/**
 * A month as the cells of a grid: nulls for the blank leading days, then 1..n.
 *
 * Returned as one array rather than as rows, because the grid wraps them itself.
 */
export const monthGrid = (year, month) => {
  const cells = new Array(leadingBlanks(year, month)).fill(null);
  const total = daysInMonth(year, month);
  for (let day = 1; day <= total; day += 1) cells.push(day);
  return cells;
};

/**
 * The years a dropdown should offer.
 *
 * Newest first: every date this app collects is a birth date or a near-future return, so the
 * recent end of a hundred-year list is where the reader is going. Always widened to include a year
 * already selected, so a record holding a date outside the range still shows its own year rather
 * than quietly displaying a different one.
 */
export const yearRange = ({ today, back, forward, min, max, selected }) => {
  let first = min || today - back;
  let last = max || today + forward;
  if (selected) {
    first = Math.min(first, selected);
    last = Math.max(last, selected);
  }
  if (last < first) last = first;
  const out = [];
  for (let year = last; year >= first; year -= 1) out.push(year);
  return out;
};
