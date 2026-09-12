/**
 * The version comparison, checked.
 *
 * There is no test runner in this app, so this is a script: `node scripts/check-update.mjs`. It
 * exists because this comparison fails silently. A phone wrongly told it is up to date says
 * nothing at all, and nobody reports silence — so the whole of a release could go uninstalled with
 * no symptom beyond teachers using an old build.
 *
 * The case that motivated it is `10.0.0` against `9.9.9`: compared as text, "10" sorts before "9",
 * and every phone would have believed itself current for the whole of version 10.
 */
import { isNewer } from '../update-core.js';

const cases = [
  ['1.1.0', '1.0.0', true, 'a minor bump'],
  ['1.0.1', '1.0.0', true, 'a patch'],
  ['1.0.0', '1.0.0', false, 'the same version'],
  ['1.0.0', '1.1.0', false, 'older than what is installed'],
  ['10.0.0', '9.9.9', true, 'ten against nine — the string trap'],
  ['1.0.10', '1.0.9', true, 'ten against nine in the patch'],
  ['v2.0.0', '1.9.9', true, 'a tag pushed by hand with a v'],
  ['1.2', '1.2.0', false, 'short form, the same version'],
  ['1.2.1', '1.2', true, 'short form, a newer patch'],
  ['1.2.3-beta', '1.2.2', true, 'a prerelease suffix'],
  ['', '1.0.0', false, 'nothing published'],
  [null, '1.0.0', false, 'null'],
  [undefined, '1.0.0', false, 'undefined'],
  ['not-a-version', '1.0.0', false, 'rubbish'],
  ['0.0.0', '1.0.0', false, 'all zeroes'],
  /* Expo Go has no native build of its own, so version.js reports an em dash. A prompt is right
     here: whatever is published is newer than "no build at all". */
  ['2.0.0', '—', true, 'the installed version is unknown'],
];

const problems = [];
for (const [candidate, current, want, why] of cases) {
  const got = isNewer(candidate, current);
  if (got !== want) {
    problems.push(`isNewer(${JSON.stringify(candidate)}, ${JSON.stringify(current)}) = ${got}, expected ${want} — ${why}`);
  }
}

console.log(`${cases.length} version comparisons checked.`);
if (problems.length === 0) {
  console.log('All correct.');
} else {
  console.error(`\n${problems.length} wrong:`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
