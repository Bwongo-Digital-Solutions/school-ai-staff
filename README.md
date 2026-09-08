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
- **Name a version yourself** — a minor or a major — by pushing that tag (`1.1.0` or
  `v1.1.0`, both work). The build follows it, and the next automatic patch bump
  continues from there.
- `versionCode` comes from the version, `1.2.3` becoming `10203`, so the two cannot
  drift. Android compares only that number when deciding whether an APK is an
  upgrade, and a stale one fails by silently not offering to install.

Each release carries the same APK twice:

| asset | for |
| --- | --- |
| `school-ai-staff.apk` | the address that never changes — `https://github.com/Bwongo-Digital-Solutions/school-ai-staff/releases/latest/download/school-ai-staff.apk`. A QR code printed today still installs next term's build. |
| `school-ai-staff-<version>.apk` | telling two downloads apart on a phone that has both. |

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
