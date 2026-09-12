/* Comparing two version numbers, and nothing else.

   Split from update.js for the same reason i18n-core.js is split from i18n.js: this half has no
   React Native in it, so Node can import it and the check script can exercise it. The comparison
   is the part of this feature most likely to be quietly wrong — a phone told it is up to date when
   it is not says nothing at all, and nobody reports silence as a bug.

   Imports elsewhere in this app carry explicit .js extensions for the same reason: Node's ESM
   resolver does not guess them, and Metro does not mind them. */

/**
 * A dotted version as numbers.
 *
 * Tolerant of a leading `v` and of a trailing suffix, because a version is typed by a person
 * somewhere along the line — pushed as a tag by hand, or entered on the Staff App settings screen.
 * `1.2.3-beta` reads as 1.2.3, which is the closest honest reading of it.
 */
const parts = (version) =>
  String(version ?? '')
    .trim()
    .replace(/^v/i, '')
    .split('.')
    .map((piece) => Number.parseInt(piece, 10))
    .map((number) => (Number.isFinite(number) ? number : 0));

/**
 * Is `candidate` a later version than `current`?
 *
 * Compared number by number, never as strings: "10" sorts before "9" as text, which would have
 * told every phone it was up to date for the whole of version 10. A shorter version is padded with
 * zeros, so 1.2 and 1.2.0 are one version rather than one being newer than the other.
 *
 * Anything that does not parse to a real version answers false. The prompt interrupts a teacher, so
 * it is only ever raised on something this is certain about.
 */
export const isNewer = (candidate, current) => {
  const a = parts(candidate);
  const b = parts(current);
  if (a.length === 0 || a.every((n) => n === 0)) return false;

  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const left = a[i] || 0;
    const right = b[i] || 0;
    if (left !== right) return left > right;
  }
  return false;
};

export default { isNewer };
