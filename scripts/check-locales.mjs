/**
 * The two catalogues, checked against each other.
 *
 * There is no test runner in this app, so this is a script: `node scripts/check-locales.mjs`. It
 * catches the three ways a translation goes quietly wrong, none of which a reader would report as a
 * bug because the screen still renders.
 */
import { en } from '../locales/en.js';
import { fr } from '../locales/fr.js';
import { translate } from '../i18n-core.js';

const problems = [];
const note = (message) => problems.push(message);

const placeholders = (text) =>
  new Set([...String(text ?? '').matchAll(/\{(\w+)\}/g)].map((m) => m[1]));

/**
 * A counted message as its separate forms, never as one blob.
 *
 * Joining the forms and comparing the union was the first version of this, and it had a hole wide
 * enough to drive through: a French singular that dropped `{count}` still passed, because the plural
 * form it was joined with still had one. Each form has to be checked against its own counterpart.
 */
const forms = (value) =>
  (typeof value === 'string' ? { '': value } : { one: value?.one, other: value?.other });

for (const [key, value] of Object.entries(fr)) {
  // A French key with no English counterpart is a rename only half applied.
  if (!(key in en)) note(`French has "${key}", English does not`);

  // Blank is worse than missing: missing falls back to English and reads fine, blank renders
  // nothing at all and an empty button is not obviously broken.
  if (typeof value === 'string' && value.trim() === '') note(`"${key}" is an empty string`);

  // A sentence that loses {count} or {name} still reads, which is exactly why nobody notices.
  if (key in en) {
    const mine = forms(value);
    const theirs = forms(en[key]);
    for (const form of Object.keys(theirs)) {
      const where = form ? `"${key}" (${form})` : `"${key}"`;
      const wanted = placeholders(theirs[form]);
      const got = placeholders(mine[form]);
      for (const name of wanted) if (!got.has(name)) note(`${where} loses {${name}} in French`);
      for (const name of got) if (!wanted.has(name)) note(`${where} invents {${name}} in French`);
    }
  }

  // English and French disagree about zero, so a counted message needs both forms in both.
  const counted = (v) => typeof v === 'object' && v !== null;
  if (counted(value) !== counted(en[key])) {
    note(`"${key}" is counted in one language and not the other`);
  }
  if (counted(value) && (!value.one || !value.other)) {
    note(`"${key}" is missing a singular or plural form in French`);
  }
}

/* And that it actually resolves. The zero case is the one worth asserting: English makes it plural
   and French makes it singular, which is the whole reason counted messages are a pair. */
const sample = 'profile.cached';
if (en[sample]) {
  const checks = [
    ['en', 0, translate('en', sample, { count: 0 })],
    ['en', 1, translate('en', sample, { count: 1 })],
    ['fr', 0, translate('fr', sample, { count: 0 })],
    ['fr', 1, translate('fr', sample, { count: 1 })],
  ];
  for (const [locale, count, text] of checks) {
    if (!text || text === sample) note(`${sample} did not resolve for ${locale} at ${count}`);
  }
  console.log('counted message, both languages:');
  for (const [locale, count, text] of checks) console.log(`  ${locale} ${count} -> ${text}`);
}

console.log(`\n${Object.keys(en).length} English messages, ${Object.keys(fr).length} French.`);
if (problems.length === 0) {
  console.log('Catalogues agree.');
} else {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
