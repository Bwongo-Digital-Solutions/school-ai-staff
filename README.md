# School Staff App — React Native

Expo/React Native staff app for [school-ai-search](https://github.com/Bwongo-Digital-Solutions/school-ai-search).
Staff scan a student ID card and see exactly what their job needs — no more.

A sibling web build of the same app (packaged for AppsGeyser) lives alongside this
one; both talk to the same API and behave the same way.

## Running it

```bash
npm install
npx expo start
```

Then set the API address in the app: **Server settings** on the sign-in screen, or
Profile → Server. It is verified against `/api/health` before being accepted, and
stored on the device.

For a local backend, the phone cannot reach `localhost` — use the machine's LAN
address (`http://192.168.x.x:8787`) and start the server bound to all interfaces:

```bash
LOCAL_BACKEND_HOST=0.0.0.0 npm run dev:server   # in the school-ai-search repo
```

## What a scan shows

The server decides which sections a profile may see and sends only those, so a
gate keeper's payload contains no fees and a cook's contains no contact details.
The app renders whatever arrives and skips anything it does not recognise.

| Profile | Role · designation | Sections |
| --- | --- | --- |
| Bursar / Administrator | `admin` (· `bursar`) | Fees, bio, class, dormitory, parent's contact, grant gate pass, grant exam clearance |
| Teacher | `teacher` | Roll call, marks, attendance, exam clearance, class, fees, bio, dormitory, parent's contact, grant gate pass |
| Gate keeper | `support_staff` · `askari` | Class, gate pass |
| Matron | `support_staff` · `matron` | Bio, class, dormitory, parent's contact, grant gate pass |
| Cook | `support_staff` · `cook` | Class, meal card |
| Support staff | `support_staff` | Fees only |

## Features

- **Gate** — an action picker (gate pass · check out · check in) opens the scanner;
  the scan lands on a confirmation, and nothing is written until Accept. A gate pass
  shows the slip somebody else issued — who allowed the trip, why, where to — then
  approve, decline, or cancel. Plus the day's movement log.
- **Roll call** — call the register for a class, or scan a card; search narrows the
  list. Marking upserts, so a student scanned after being marked absent ends up
  present rather than colliding with the one-record-per-day index.
- **Exam clearance** — a bursar grants it, an invigilator checks it at the door and
  admits or turns the student away. Refusals are recorded.
- **Notifications** — a bell carrying staff messages (to one person, a group, or
  everybody) and system events. Read state is per person.
- **Assistant** — chat and search over student data, admin and teachers only. Replies
  arrive as Markdown and are rendered as such, tables included.
- **Themes** — dark and light, both driven from one set of tokens.

## Installing it on a phone

There is no Play Store listing. The APK is published as a GitHub release, which is
the one shape the alternative installers can read.

**Every merge to `main` publishes one.** The workflow works out the next version by
taking the highest tag and bumping the patch, stamps it into `app.json` for the
build only, and creates the release and its tag together. Nothing is committed back
to `main` and no tag needs pushing by hand — a workflow that commits to the branch
that triggered it is a loop waiting to be tripped, and a tag pushed with
`GITHUB_TOKEN` would never have triggered the build anyway.

- **Skip a release** by putting `[no release]` in the merge commit message. A README
  fix does not need a version.
- **Releases are serialised.** Two merges a minute apart once both read the tag list before either
  had released, both settled on the same version, and the second overwrote the first's APK — leaving
  the tag on one commit and the binary on another. One release runs at a time now, and a run that
  finds its tag already taken stops rather than publishing over it. If three merges land at once the
  middle one may go unreleased; the newest code always ships, which is the part that matters.
- **Name a version yourself** — a minor or a major — by setting `expo.version` in
  `app.json` above the highest tag. The next merge releases exactly that, and patch
  bumps carry on from it. Once that version has been released the tag overtakes the
  file, so leaving a stale number in `app.json` can neither pin the version nor
  release one twice. Pushing the tag by hand still works too (`1.1.0` or `v1.1.0`),
  but a version is a decision about the software and belongs in the software, where
  it can be reviewed like any other change.
- `versionCode` comes from the version, `1.2.3` becoming `10203`, so the two cannot
  drift. Android compares only that number when deciding whether an APK is an
  upgrade, and a stale one fails by silently not offering to install.

Each release carries the same APK twice:

| asset | for |
| --- | --- |
| `school-ai-staff.apk` | the address that never changes — `https://github.com/Bwongo-Digital-Solutions/school-ai-staff/releases/latest/download/school-ai-staff.apk`. A QR code printed today still installs next term's build. |
| `school-ai-staff-<version>.apk` | telling two downloads apart on a phone that has both. |

### Signing

Releases are signed with the project's own key, held in repository secrets.

This matters more than it sounds. `android/` is generated by `expo prebuild` and is gitignored, so
what arrives on every build is the React Native template's `debug.keystore` — `CN=Android Debug`,
alias `androiddebugkey`, password `android`, byte-identical in every React Native project in the
world. Android accepts an update to an installed app from whoever holds the signing key, so an APK
signed with that keystore can be replaced on a teacher's phone by anybody who cares to build one.
Every release up to and including `1.1.1` was signed that way.

Generate the key once, on a machine you trust, and keep the file somewhere it cannot be lost — if
it goes, nobody can ever publish an update that installs over the current app:

```bash
keytool -genkeypair -v \
  -keystore school-ai-staff.keystore -alias school-ai-staff \
  -keyalg RSA -keysize 4096 -validity 10000

base64 -w0 school-ai-staff.keystore    # paste this into the secret below
```

Then set four repository secrets (Settings → Secrets and variables → Actions):

| secret | value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | the base64 above |
| `ANDROID_KEYSTORE_PASSWORD` | the keystore password |
| `ANDROID_KEY_ALIAS` | `school-ai-staff` |
| `ANDROID_KEY_PASSWORD` | the key password |

Without them the release job **fails rather than publishing a debug-signed APK**, and after the
build the workflow reads the certificate back out of the APK and refuses anything showing
`CN=Android Debug`. Intent is not evidence; the APK is.

> **One-off cost.** Android will not install an update signed with a different key. A phone holding
> `1.1.1` or earlier has to uninstall the app once before installing the first properly signed
> build. Worth doing now, with a handful of installs, rather than later with hundreds.

### On IzzyOnDroid

[IzzyOnDroid](https://apt.izzysoft.de/fdroid/) is an F-Droid-style repository whose apps are
searchable by name in the F-Droid client and in Obtainium. Unlike Komi Store's index — a daily crawl
of GitHub ranked by stars, which a school's internal app will never place in — it accepts
submissions.

What it needs from this repository is here:

- a free/libre licence (`LICENSE`, GPL-3.0);
- release APKs attached to GitHub releases (the release job);
- **binaries signed by the developer**, not with a debug key (above);
- listing text and an icon under `fastlane/metadata/android/en-US/`, which is also the layout
  F-Droid and Play's upload tooling read.

Adding a screenshot or two under `images/phoneScreenshots/` is worth doing before submitting; they
are optional but the listing looks unfinished without them.

Requesting inclusion is a manual step: open an issue on
[IzzyOnDroid's repodata tracker](https://codeberg.org/IzzyOnDroid/repodata) naming this repository.
Their policy is theirs to apply, so read it first rather than treating the list above as the whole
of it.

A changelog per release is optional. `fastlane/metadata/android/en-US/changelogs/<versionCode>.txt`
is shown for that version if present — `10101.txt` is version 1.1.1, since versionCode is derived
from the version as `1.1.1` → `10101`.

### Komi Store

[Komi Store](https://komistore.app) installs from releases on GitHub, Codeberg,
Forgejo or Gitea — it has no direct-file source at all. Add this repository to it:

```
https://github.com/Bwongo-Digital-Solutions/school-ai-staff
```

Everyone with Komi Store then sees each new release as an update, because the
release is public, is marked latest, and carries an APK. All three matter: a draft
or a prerelease is invisible to it, and the release that existed before this
workflow had no APK attached at all.

### Obtainium

[Obtainium](https://github.com/ImranR98/Obtainium) takes either the repository or the
unchanging asset address above, and versions it by the APK's own hash. The school's
web app shows a QR code for both installers on its sign-in page.

## Notes

- A write is only shown as successful once the server echoes back the row it wrote,
  so a failed save cannot look like a successful one.
- Camera scanning uses `expo-camera`'s barcode reader and needs the camera permission
  declared in `app.json`.
- Role gating in the app shapes what is shown. The API enforces it independently for
  the assistant and search; the scan sections are shaped server-side but requests
  carry no verified identity yet.
