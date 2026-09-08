#!/usr/bin/env node
/**
 * Point the generated Android project at the project's own signing key.
 *
 * `android/` is produced by `expo prebuild` and is gitignored, so what arrives on every build is
 * the React Native template's `debug.keystore` — `CN=Android Debug`, alias `androiddebugkey`,
 * password `android`, byte-identical in every React Native project in the world. Prebuild wires the
 * *release* build type to it.
 *
 * That is not a small thing. Android accepts an update to an installed app from whoever holds the
 * signing key, so an APK signed with that keystore can be replaced on a teacher's phone by anybody
 * who cares to build one — and everybody has the key. It is also why IzzyOnDroid will not list an
 * app: their repository is "official binaries built and signed by the original developers".
 *
 * So this rewrites `android/app/build.gradle` to sign releases with a key supplied through CI
 * secrets, and **fails loudly** if the rewrite does not take. A silent no-op here would publish a
 * debug-signed APK that looks exactly like a good one.
 *
 *   node scripts/use-release-signing.mjs
 *
 * Expects the four ESCHOOL_UPLOAD_* properties to exist in android/gradle.properties, written by
 * the workflow from repository secrets.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const GRADLE = 'android/app/build.gradle';

const SIGNING_CONFIG = [
  '        release {',
  '            storeFile file(ESCHOOL_UPLOAD_STORE_FILE)',
  '            storePassword ESCHOOL_UPLOAD_STORE_PASSWORD',
  '            keyAlias ESCHOOL_UPLOAD_KEY_ALIAS',
  '            keyPassword ESCHOOL_UPLOAD_KEY_PASSWORD',
  '        }',
  '',
].join('\n');

const original = readFileSync(GRADLE, 'utf8');
let gradle = original;

/**
 * The `signingConfigs { … }` block, found by matching braces rather than by regex.
 *
 * This has to be exact. A regex looking for `release {` "somewhere after signingConfigs" happily
 * matches the `release {` inside `buildTypes` further down the file — which is how an earlier
 * version of this script decided the release signing config already existed, skipped creating it,
 * and produced a build.gradle referring to a `signingConfigs.release` that was never written.
 */
const signingConfigsBlock = (source) => {
  const start = source.search(/signingConfigs\s*\{/);
  if (start < 0) return null;

  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return { start, open, end: i, text: source.slice(open, i + 1) };
    }
  }
  return null;
};

const block = signingConfigsBlock(gradle);
if (!block) {
  throw new Error(`${GRADLE} has no signingConfigs block; the generated project is not the shape this expects.`);
}

// Added beside the debug one rather than replacing it: `assembleDebug` still wants the debug
// config, and a local developer build should keep working untouched.
if (!/\brelease\s*\{/.test(block.text)) {
  gradle = `${gradle.slice(0, block.open + 1)}\n${SIGNING_CONFIG}${gradle.slice(block.open + 1)}`;
}

if (!signingConfigsBlock(gradle)?.text.includes('ESCHOOL_UPLOAD_STORE_FILE')) {
  throw new Error('The release signing config was not added to signingConfigs.');
}

// Then move the release *build type* off the debug key. This is the line that actually decides
// what the published APK is signed with.
const beforeSwitch = gradle;
gradle = gradle.replace(
  /(buildTypes[\s\S]*?\brelease\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/,
  '$1signingConfig signingConfigs.release',
);

if (gradle === beforeSwitch) {
  throw new Error('The release build type does not reference signingConfigs.debug, so nothing was switched. Refusing to continue: the APK would be signed with whatever it was going to be signed with.');
}
if (/buildTypes[\s\S]*?\brelease\s*\{[\s\S]*?signingConfig\s+signingConfigs\.debug/.test(gradle)) {
  throw new Error('The release build type still references the debug signing config after rewriting.');
}

writeFileSync(GRADLE, gradle);
console.log('Release builds now use signingConfigs.release.');
