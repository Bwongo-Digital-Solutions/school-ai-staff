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

## Notes

- A write is only shown as successful once the server echoes back the row it wrote,
  so a failed save cannot look like a successful one.
- Camera scanning uses `expo-camera`'s barcode reader and needs the camera permission
  declared in `app.json`.
- Role gating in the app shapes what is shown. The API enforces it independently for
  the assistant and search; the scan sections are shaped server-side but requests
  carry no verified identity yet.
