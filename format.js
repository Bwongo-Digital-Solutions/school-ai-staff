/**
 * Names, dates, times and money, as a person reads them.
 *
 * Every function that produces something read by a human now follows the app's language. It does
 * that by reading one module-level value rather than taking a locale argument, because these are
 * called from about fifty places and none of them could sensibly thread one through.
 * `LanguageProvider` sets it during render, so it is correct before any screen renders with it.
 *
 * `Intl` is still not used here, for the reason it never was: Hermes ships without full `Intl` on
 * every platform this runs on, so French month names and separators are written out rather than
 * asked for.
 */

const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  /* The short forms French actually abbreviates. Mai, juin and août are not shortened, and the
     others take a full stop — "sept." not "sep". */
  fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
};

/* The full month names, for the date picker's month dropdown, and the weekday initials for its
   grid. Written out for the same reason as the short forms above — Hermes has no full `Intl` here,
   so asking for them would give English on the devices this actually runs on.

   French months are lower case: a French reader writes "14 mars 2011", never "14 Mars 2011". The
   week starts on Monday in both languages, which is what the grid below is ordered by. */
const MONTH_NAMES = {
  en: ['January', 'February', 'March', 'April', 'May', 'June',
       'July', 'August', 'September', 'October', 'November', 'December'],
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
       'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
};

const WEEKDAYS = {
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
  fr: ['lu', 'ma', 'me', 'je', 've', 'sa', 'di'],
};

/** The twelve month names in the language now being read, January first. */
export const monthNames = () => MONTH_NAMES[locale];

/** The seven weekday initials, Monday first, in the language now being read. */
export const weekdayInitials = () => WEEKDAYS[locale];

/* A narrow no-break space, which is what French groups thousands with. Written as an escape because
   the character itself is invisible in a diff. */
const NBSP = '\u00A0';

const GROUP = { en: ',', fr: NBSP };

let locale = 'en';

/** Called by LanguageProvider. Not for screens — they read the formatters, not this. */
export const setFormatLocale = (next) => {
  locale = next === 'fr' ? 'fr' : 'en';
};

export const formatLocale = () => locale;

export const fullName = (s) =>
  `${(s && s.first_name) || ''} ${(s && s.last_name) || ''}`.trim();

export const initials = (s) =>
  ((((s && s.first_name) || '')[0] || '') + (((s && s.last_name) || '')[0] || '')).toUpperCase();

/** The card and the register carry one `full_name` rather than two columns. */
export const initialsOf = (name) =>
  String(name || '')
    .split(/\s+/)
    .map((word) => word[0] || '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

/* "Grade 7 · B". The word in front is the one part that changes language; the number and the
   stream do not. */
const CLASS_WORD = { en: 'Grade', fr: 'Classe' };

export const classOf = (s) => {
  const grade = s && s.grade_level != null ? s.grade_level : '—';
  const section = s && s.class_section ? ` · ${s.class_section}` : '';
  return `${CLASS_WORD[locale]} ${grade}${section}`;
};

/** Backend statuses arrive as snake_case enum values ("no_invoices"). */
export const humanise = (value) =>
  String(value == null ? '' : value)
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase()) || '—';

export const amount = (n) => {
  const rounded = Math.round(Number(n) || 0);
  const sign = rounded < 0 ? '-' : '';
  return sign + String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, GROUP[locale]);
};

/* French puts the currency after the number, English before it. Not a separator difference — the
   two parts genuinely swap places, which is why no amount of locale data would have fixed the old
   hardcoded order. */
export const money = (n, currency = 'UGX') => {
  const code = currency || 'UGX';
  const value = amount(n);
  return locale === 'fr' ? `${value}${NBSP}${code}` : `${code} ${value}`;
};

export const formatDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${day} ${MONTHS[locale][parsed.getMonth()]} ${parsed.getFullYear()}`;
};

export const formatTime = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/* "at" / "à" — the one word in a date-and-time, and the only part of `formatTime` that is not
   already language-neutral: 24-hour time is written the same way in both. */
const AT = { en: 'at', fr: 'à' };

export const dateTime = (value) =>
  (value ? `${formatDate(value)} ${AT[locale]} ${formatTime(value)}` : '—');

/* The register and the gate log are keyed on the device's own day, not UTC, so a
   late-evening roll call in Kampala does not land on tomorrow's date. */
export const todayIso = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

/* `toFixed` always writes a full stop. French uses a comma for the decimal mark, and a number
   written the other way reads as a thousands separator — 3.45 looks like three thousand. */
const decimal = (text) => (locale === 'fr' ? String(text).replace('.', ',') : String(text));

export const gpaOf = (s) => decimal(Number((s && s.gpa) || 0).toFixed(2));

/**
 * A percentage off the server, or a dash.
 *
 * `null` means "no denominator yet" — a school that has called no register has no attendance rate,
 * which is a different fact from 0%, and showing a zero there would read as nobody turning up.
 */
export const percent = (value, decimals = 0) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  const text = decimal(Number(value).toFixed(decimals));
  return locale === 'fr' ? `${text}${NBSP}%` : `${text}%`;
};

/* French typography puts a no-break space before the per-cent sign. U+00A0, never U+202F: the
   narrow one cannot be encoded in WinAnsi and throws when a PDF is drawn. */
export const attendanceOf = (s) => {
  const value = Number((s && s.attendance_rate) || 0).toFixed(0);
  return locale === 'fr' ? `${value}${NBSP}%` : `${value}%`;
};
