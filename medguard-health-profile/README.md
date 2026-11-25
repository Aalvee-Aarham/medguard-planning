# MedGuard Health Profile (App 1 of 4)

The public phone app: one health record per person, medicine reminders, QR sharing, family profiles, Ask AI, similar cases and doctor mode. Frontend only, running on mock data.

- Spec: [PLAN.md](PLAN.md)
- Build log, decisions and test results: [ArKo_AI_LOG.md](ArKo_AI_LOG.md)

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build + service worker
npm run preview    # serve the build (installable PWA)
npm run i18n       # regenerate en.json, list strings missing from bn.json
```

Works at any width: phones get a bottom nav, desktops (1024 px and up) get a left sidebar and wider pages. It also installs as an app (PWA) on Android, iPhone and desktop Chrome or Edge.

## Demo data

| | |
|---|---|
| OTP code | `123456` |
| App lock PIN | `1234` |
| BMDC numbers that pass | anything starting with `A-` (try `A-12345`) |
| People | Arif Hasan (you), Rahima Begum (mother, Penicillin allergy), Nasrin Akter (caregiver), Dr. Karim Hossain |

The **Dev panel** (wrench button, bottom right) shows in dev builds, or add `?dev` to the URL of a production build. It toggles offline and API errors, simulates admit / waiting list / discharge, sends emergency access, fires a medicine reminder, answers an urgency request, switches role and resets the data.

## Folder layout

```
src/
  app/          routes.tsx (one route per screen ID), Layout.tsx (top bar, bottom nav), Gates.tsx (lock, limits, forced update)
  screens/      onboarding, home, upload, record, medicines, ai, similar, share, family, doctor, premium, notifications, settings
  components/   shared UI: ui, status (StatusChip, AllergyStrip, SourceLabel, AiField, OfflineBanner), states, overlays, TrendChart, art, CheckDraw
  three/        recordScene.ts: the Three.js scene on the Welcome screen
  lib/          format (dates, times), doses, batch, motion (GSAP setup)
  mock/         types.ts, seed.ts, api.ts (fake latency)
  state/        store.tsx (React context + localStorage)
  i18n/         en.json (generated), bn.json, index.ts (t())
  dev/          DevPanel.tsx
scripts/        i18n-check.mjs
```
