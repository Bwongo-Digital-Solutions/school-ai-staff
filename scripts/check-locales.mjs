/**
 * The two catalogues, checked against each other.
 *
 * There is no test runner in this app, so this is a script: `node scripts/check-locales.mjs`. It
 * catches the three ways a translation goes quietly wrong, none of which a reader would report as a
 * bug because the screen still renders.
 */
import { readFileSync, readdirSync } from 'node:fs';

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

/* --------------------------------------------------------- keys the source asks for ---------- */

/**
 * Every key the app actually looks up, checked against the catalogue.
 *
 * The web app gets this from TypeScript: `t` is typed against the English catalogue there, so a
 * mistyped key is a build error. This app has no such net — `t('typo.key')` renders the key on
 * somebody's screen and nothing objects. That is exactly how `roster.allStreams` reached a pushed
 * branch in the web app during the one window where its typecheck was silently checking nothing.
 *
 * Two shapes are collected: `t('some.key')` calls, and the `'some.key'` strings held as values in
 * the label maps (roles.js, AlertHost's TONES), which are looked up later rather than called here.
 */
const SOURCE_DIRS = ['screens', 'components'];
const SOURCE_FILES = ['App.js', 'roles.js', 'alerts.js', 'api.js', 'format.js', 'branding.js', 'probe.js'];

const sources = [];
for (const dir of SOURCE_DIRS) {
  const here = new URL(`../${dir}/`, import.meta.url);
  for (const name of readdirSync(here)) {
    if (name.endsWith('.js')) sources.push([`${dir}/${name}`, readFileSync(new URL(name, here), 'utf8')]);
  }
}
for (const name of SOURCE_FILES) {
  sources.push([name, readFileSync(new URL(`../${name}`, import.meta.url), 'utf8')]);
}

/* Prefixes reached by building the key at runtime — `enum.${value}` in `labelOf`. Those cannot be
   checked from here, and `labelOf` falls back to `humanise` for anything missing, so they are
   deliberately exempt rather than reported as unused. */
const DYNAMIC_PREFIXES = ['enum.'];

/** The first segment of every key the catalogue defines — what makes a dotted string a key ask. */
const NAMESPACES = new Set(Object.keys(en).map((key) => key.split('.')[0]));

const asked = new Map();
for (const [name, text] of sources) {
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const m of stripped.matchAll(/\bt\(\s*'([a-zA-Z][\w.]*)'/g)) {
    asked.set(m[1], `${name}:${stripped.slice(0, m.index).split('\n').length}`);
  }
  /* Keys held as values: `fallbackTitle: 'alert.done'`, `admin: 'role.admin'`.
     Only accepted when the first segment is a namespace the catalogue actually uses — otherwise
     this matches every dotted string in value position, and reports `marksheet.jpg` and the
     `kps.user` storage key as missing translations. */
  for (const m of stripped.matchAll(/:\s*'([a-z][\w]*)\.([\w.]+)'/g)) {
    if (!NAMESPACES.has(m[1])) continue;
    asked.set(`${m[1]}.${m[2]}`, `${name}:${stripped.slice(0, m.index).split('\n').length}`);
  }
}

for (const [key, where] of asked) {
  if (key in en) continue;
  if (DYNAMIC_PREFIXES.some((prefix) => key.startsWith(prefix))) continue;
  note(`${where} asks for "${key}", which no catalogue defines`);
}

console.log(`${asked.size} keys asked for by the source.`);

console.log(`\n${Object.keys(en).length} English messages, ${Object.keys(fr).length} French.`);
if (problems.length === 0) {
  console.log('Catalogues agree.');
} else {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
