# ArKo AI Log: MedGuard Health Profile frontend

A record of how the Health Profile app (App 1 of 4) was built: what was read, which skills were used, every decision and deviation from the plan, what each file does, how it was tested, what broke and how it was fixed, and what is still open.

- **Date:** 25 Nov 2026
- **Folder:** `medguard-health-profile/`
- **Result:**
  - All 68 main + 17 settings screens built and routed.
  - Responsive web app for phone, tablet and desktop (section 10).
  - Production build and PWA pass.
  - Bangla 881 of 881 strings translated.
  - All 6 key flows from PLAN.md section 7 clicked through in a headless browser.
- **Updated 26 Nov 2026:**
  - Home, My Record and every record sub-page redesigned: a 3D anatomy body, glassmorphism, neumorphism and skeuomorphism (sections 11 to 17).
  - Section 18 summarises that redesign pass.

---

## 1. Sources read before building

| File | What I took from it |
|---|---|
| `../README.md` | Stack (React + Vite + TS + Tailwind v4 + GSAP + vite-plugin-pwa). Animation rules: 150–250 ms, `power2.out`, never animate safety-critical controls, `gsap.matchMedia()` for reduced motion, parallax only on onboarding, welcome, empty states and headers. PWA manifest values. Offline rules |
| `PLAN.md` (this folder) | The spec: screen IDs and routes, shared components, mock cast, Dev panel, defaults for open items, build order, "Done when" list |
| `../plan.md` and `../plan.docx` | Same content as each other. The 15 safety rules, the 12 screen states, notification tiers, the 6 key flows, roles, open items |
| `../UI theme prompt (1).md` | The design system: colour tokens, type scale (English and Bangla), spacing scale, radii, shadows, components, alert tiers, tone, accessibility, motion |
| `../MedGuardAI_Proposal.pdf` | Context: Bangladeshi public wards, privacy-first local AI, PMC-Patients (167k cases) for similar cases, Team O(1), AUST |
| `../medguard-ward/PLAN.md`, `../medguard-ward-dashboard/PLAN.md`, `../medguard-admin-console/PLAN.md` | Skimmed for hand-offs into this app: QR scan and emergency access (Ward W25), take-home meds at discharge (W48), urgency request answers (Dashboard D10). Mocked through the Dev panel |

## 2. Skills and plugins used

| Skill | How it was applied |
|---|---|
| `frontend-design:frontend-design` | Plan first, then build. The brief pins the look (light, clinical, bluish, flat), and the skill says the brief wins, so the palette and type were not changed. Boldness is spent in one place, the Welcome 3D scroll scene; everything else stays quiet. No eyebrow labels, no numbered markers, sentence case |
| `taste-skill:design-taste-frontend` | This skill targets marketing websites, and its page pipeline (deal scripts, gate checks for heroes and sections) does not fit an 85-screen app. Its motion rules were applied: buttons step on hover and press on click, linked cards lift 2 px, no card fades in on scroll, no parallax on text, no tilt or carousels, everything rests under reduced motion and nothing stays hidden |
| `meta-skills:web3d-integration-patterns` | Pattern 1, layered separation: `three/recordScene.ts` owns Three.js only; GSAP ScrollTrigger drives it through `setProgress()`; React owns the text. One library per property. Every tween and ScrollTrigger is killed on unmount, geometries, materials and the renderer are disposed. Renders on demand only, with no idle loop |
| `animation-components:animejs` | anime.js v4 (`createTimeline`, `svg.createDrawable`, `stagger`) for SVG stroke drawing: the splash and lock-screen logo, and the success check marks. Lazy-loaded with `import('animejs')` |
| `core-3d-animation:gsap-scrolltrigger`, `core-3d-animation:threejs-webgl` (via the meta-skill) | Pinned scroll track with `scrub` and `snap`; Three.js scene with quaternion slerp between poses |
| Playwright MCP | Could not start (no Chrome in `/opt/google/chrome`). Used `playwright-core` with the installed Microsoft Edge in headless mode instead, from the session scratchpad (not added to the project) |

## 3. Decisions and deviations from the plan

| # | Decision | Why |
|---|---|---|
| D1 | The 3D and scroll motion lives on the Welcome screen (H3). Elsewhere: a header parallax on Home, parallax on empty-state line art, page fade-up, entrances on mount only | The design system says "no decorative animation"; the README allows parallax only on onboarding, welcome, empty states and headers. The user asked for a modern 3D scroll app, so the 3D goes where the rules allow it |
| D2 | Added `three` and `animejs`, beyond the plan's library list | PLAN.md allows another library when a screen can't be built without it. A real 3D scene needs Three.js; the user asked for anime.js. Both are lazy-loaded: Three.js only when H3 opens, anime.js on first use |
| D3 | Never animated: allergy strip, Taken button, confirm dialogs, the urgent "Call 999" warning, the QR | README safety rule. Success check marks play *after* the state has already changed |
| D4 | i18n keys are the English strings. `bn.json` maps English to Bangla. `en.json` is generated by `npm run i18n`, which also lists missing Bangla strings. Dev builds log `[i18n] missing bn:` for dynamic keys the scan can't see | Every visible string goes through `t()` without writing each string twice. Gives a completeness check |
| D5 | Mobile first: built for 360–430 px first, then widened into a full web app (section 10) | PLAN.md says phone only; the user then asked for a web app |
| D6 | Text size (S9) scales a `--ts` variable used by every type token, not the layout. The bottom nav caps at 125% | First version used CSS `zoom`, which shrank the layout and overflowed at 200% (see 7.3) |
| D7 | Dev panel shows in dev builds, or with `?dev` in a production URL. Its own labels are English only | It is a developer tool, not product UI |
| D8 | "Confirm all" on H23 confirms every field, including low-confidence ones, which stay highlighted with a dashed amber border and "Hard to read" until then | PLAN.md defines Confirm all. Highlighting plus "View original" next to each field is the safeguard |
| D9 | Upload "AI reading" runs in a global processor in `Gates.tsx`, not on the Processing screen | PLAN.md H21: "You can leave, we'll notify you." Leaving the screen does not stop it; a notification arrives when done |
| D10 | H33, H52, H60 and S17 are a dialog or sheet over the current route, not routes | PLAN.md routing rule |

## 4. Design and motion

**Theme.** Tokens from PLAN.md section 4 are in `src/index.css` under Tailwind v4 `@theme`, with `--color-*: initial` so no other colour can be used by accident. Spacing uses a 4 px base (`p-1`=4 … `p-16`=64). Type tokens match the theme prompt, with separate Bangla sizes and line heights on `html[lang=bn]`. Fonts: Noto Sans and Noto Sans Bengali from Google Fonts, cached by the service worker.

**Motion inventory**

| Where | What | Library | Reduced motion |
|---|---|---|---|
| H3 Welcome | 7 white pages drawn with blue edge lines fly in and stack into one record (entrance, 1.4 s once). Scrolling scrubs through: stack → fan of cases where 3 matches turn blue → pages close and a blue shield forms. Snaps to each slide; dots and Next also scroll | Three.js + GSAP ScrollTrigger | Static blue line SVG per slide, plain scrolling |
| H1 Splash, H16 Lock, H4 Auth | Logo strokes draw in | anime.js | Logo shown |
| H23 done, H37 Taken, J1 verified, J3 scanned, H58 paid, Home after Taken | Check mark ring and tick draw, small pop | anime.js | Mark shown |
| H17 Home header | Two soft blue shapes drift slower than the page | GSAP ScrollTrigger | Still |
| Empty states | Line-art layers at different depths | GSAP ScrollTrigger | Still |
| Every route change | 200 ms fade-up of the main area | GSAP | None |
| Home cards | Enter once on load, 40 ms stagger, 220 ms | GSAP | None |
| Sheets and dialogs | 250 ms slide-up / 200 ms fade | CSS | None |
| Buttons and linked cards | Step up 1 px or lift 2 px on hover, press to 0.98 | CSS | None |

## 5. What was built

### 5.1 Files

| Path | Purpose |
|---|---|
| `src/index.css` | Theme tokens, Bangla type, focus ring, button and card motion, skeleton pulse, reduced-motion overrides |
| `src/app/routes.tsx` | One route per screen ID, commented with the ID. Areas are lazy-loaded per folder |
| `src/app/Layout.tsx` | Top bar (H52 profile switcher, bell with unread count), offline banner, high-tier alert banner, 64 px bottom nav with raised Upload |
| `src/app/Gates.tsx` | Sign-in guard, auto-lock timer, H16 lock overlay (keeps unsaved input), forced update, maintenance, upload processor, H60 sheet, toasts, Dev panel |
| `src/state/store.tsx` | App state in React context + `localStorage`; roles and permissions; offline queue and "All synced"; text size and language on `<html>` |
| `src/mock/types.ts`, `seed.ts`, `api.ts` | Types from PLAN.md section 9; the shared cast; fake latency 300–800 ms with forced errors |
| `src/components/ui.tsx` | Button (4 variants, loading keeps label), Card, Input (label above, unit inside), Textarea, Select, Toggle, Checkbox, Radio, Tabs, PageHeader, ListRow, Note, ActionBar |
| `src/components/status.tsx` | StatusChip (colour + icon + word), AllergyStrip (never blank), SourceLabel, AiField, OfflineBanner, NeedsInternet |
| `src/components/states.tsx` | Skeleton, ListSkeleton, EmptyState, ErrorState, Loadable, NoAccess, FullMessage |
| `src/components/overlays.tsx` | Sheet, ConfirmDialog (Cancel left, reason field), Toast (4 s), LimitSheet (H60) |
| `src/components/TrendChart.tsx` | Recharts line, normal range as a primary-50 band, out-of-range points red with their value |
| `src/components/art.tsx` | Empty-state line art with parallax, DocThumb (mock document page), CountUp |
| `src/components/CheckDraw.tsx` | anime.js check mark and logo |
| `src/three/recordScene.ts` | The Welcome Three.js scene |
| `src/lib/` | Date and time formatting (English digits), dose scheduling and logging, mock upload batches, GSAP setup |
| `src/i18n/` | `t()` hook, `bn.json` (Bangla), generated `en.json` |
| `src/dev/DevPanel.tsx` | Every toggle and simulation listed in PLAN.md section 9 |
| `scripts/i18n-check.mjs` | String extraction and Bangla completeness check |

### 5.2 Screen coverage

| Area | IDs | File |
|---|---|---|
| A. First launch and sign-in | H1–H16 | `screens/onboarding/Start.tsx`, `Auth.tsx`, `Welcome.tsx` |
| B. Home | H17, H18 | `screens/home/Home.tsx` (+ `Menu.tsx`) |
| C. Upload and AI extraction | H19–H25 | `screens/upload/Upload.tsx` (H24 in `record/Record.tsx`) |
| D. My Record | H26–H33 | `screens/record/Record.tsx` |
| E. Medicines and reminders | H34–H38 | `screens/medicines/Medicines.tsx` |
| F. Ask AI | H39, H40 | `screens/ai/Ai.tsx` |
| G. Similar cases | H41–H46 | `screens/similar/Similar.tsx` |
| H. Share and access | H47–H51 | `screens/share/Share.tsx` |
| I. Family and caregivers | H52–H56 | `app/Layout.tsx` (H52), `screens/family/Family.tsx` |
| J. Doctor mode | J1–J6 | `screens/doctor/Doctor.tsx` |
| K. Premium | H57–H60 | `screens/premium/Premium.tsx`, `components/overlays.tsx` (H60) |
| L. Notifications | H61, H62 | `screens/notifications/Notifications.tsx` |
| S. Settings | S1–S17 | `screens/settings/Settings.tsx` (S8 reuses H2, S10 = H62, S17 is a dialog) |

### 5.3 Safety rules, where each one lives

| Rule | Implementation |
|---|---|
| 1 AI drafts, a person confirms | `AiField` amber tag until confirmed; nothing enters the record before H23 Confirm all |
| 2 Source on every item | `SourceLabel` on record items, documents, medicines, tests, admissions |
| 5 Allergies always visible | `AllergyStrip` on H26, J4, H34, H35, H37; "No known allergies" when empty. Manual medicine entry warns on a Penicillin clash |
| 6 Two taps to critical | Taken is on Home; My QR is one tap from Home |
| 7 Colour + icon + word | `StatusChip`, taken-log calendar and legend, test range chips |
| 8 Alert tiers | High: banner under the top bar, one action, stays until acted on, sound and vibration once. Normal: inbox and badge. No full-screen takeovers in this app |
| 9 Offline visible | `OfflineBanner` with queue count; online-only actions greyed with "Needs internet"; edits queue and sync; "All synced" for 3 s |
| 10 Risky actions confirmed | Delete hospital record (reason), revoke, remove caregiver, delete document, report misuse (reason required), delete account (OTP), cancel Premium, log out (warns about unsynced actions) |
| 11 Everything logged | Access log rows for views, edits, adds, shares, revokes, emergency access |
| 12 Bangla and English | Full `bn.json`; drug names stay as written; doses and times in English digits |
| 13 Text size and contrast | S9 at 100, 125, 150, 200%; tokens only from the theme |
| 15 Session safety | Auto-lock after S7 minutes; PIN or biometric unlock over the current screen, keeping input |

### 5.4 PWA

`vite-plugin-pwa`, `registerType: 'autoUpdate'`. Manifest: name, 192 and 512 px icons (plus maskable), `theme_color #1D5FBF`, `background_color #F5F8FC`, `display: standalone`. The service worker precaches 35 files (1.7 MB, including the lazy Three.js chunk so Welcome works offline) and caches Google Fonts. Data the user has seen is in `localStorage`, so Record, Medicines and reminders open offline.

## 6. Testing

All in headless Microsoft Edge (via `playwright-core`) at 390 × 844 with touch, against the Vite dev server.

| Test | Result |
|---|---|
| `tsc` strict, no unused locals | Pass |
| `npm run build` | Pass. Main chunk 92 kB gzip; Three.js 141 kB gzip and charts 117 kB gzip load only where used |
| `npm run i18n` | 806 of 806 strings translated |
| Onboarding: Splash → Language → Welcome → Skip → Phone → OTP 123456 → Consent (Continue disabled until 3 ticks) → Account type → Profile → Biometric → Notifications → Home | Pass, no console errors |
| Welcome 3D: slides 1, 2 and 3 by scroll position | Pass: stack, fan with 3 blue matches, shield |
| Welcome with `prefers-reduced-motion: reduce` | Pass: static SVG, no WebGL loaded |
| Flow 1, build profile: Upload → Camera 3 pages (page 3 blur warning) → Processing → 3 issues resolved → Review (3 low-confidence highlighted) → Confirm all → Record | Pass |
| Flow 2, similar cases: urgent "Call 999" card shows for Rahima above results; outcome collapsed | Pass |
| Flow 3, waiting list: Dev "waiting list" → Request urgent review with reason → "Sent. Ward staff will decide." → Dev "Answer" → "Priority raised", position 1 | Pass |
| Flow 4, hospital stay: Dev "Admit" → Home shows Shanti Hospital, Neuro Ward B, Bed 7 → Dev "Discharge" → new admission record, Clopidogrel 75 mg added to Medicines with reminders | Pass |
| Flow 5, emergency access: Dev → red high banner → H51 | Pass |
| Flow 6, doctor: J1 `A-12345` passes → J3 simulate scan → J4 record with allergy strip and 24 h countdown → J5 note → patient sees "Added by Dr. Karim Hossain" | Pass after fix 7.2 |
| Offline: banner, Camera, Gallery and PDF greyed with reason, Type it in still works | Pass |
| Free limit: 20 of 20 chats used → H60 sheet with reset date | Pass |
| Lock: H16 over the current route, PIN 1234 | Pass |
| All 55 routes in Bangla, collecting `[i18n] missing` warnings and page errors | Pass after fixes 7.1 and 7.4 |
| 360 px wide at 200% text | No horizontal scroll after fix 7.3 |

Screenshots were saved in the session scratchpad only, not in the project.

## 7. Problems found and fixed

| # | Problem | Fix |
|---|---|---|
| 7.1 | React error "destroy is not a function" on Ask AI. `useEffect(() => el.scrollIntoView(...))` returned the Promise that newer Chromium returns from `scrollIntoView` | Effect body in braces (`screens/ai/Ai.tsx`) |
| 7.2 | After BMDC verification, a doctor's note said "Arif Hasan added a prescription" because it used the account name | Verified name stored on `account.doctor.name`; J2–J6 use it. The note's notification is now normal tier (the plan lists it as normal) |
| 7.3 | Text size 200% used CSS `zoom`, which shrank the layout to 180 px and overflowed | `--ts` variable scales the type tokens only; `overflow-wrap: break-word`; Home dose row wraps; bottom nav capped at 125%; wordmark hidden above 150% |
| 7.4 | Dynamic keys missed by the static scan (test names, plan table values, consent rows) | Added to `bn.json`; the dev warning stays on to catch future ones |
| 7.5 | Sticky action bars at `bottom: 0` sat under the fixed bottom nav on long screens | `bottom: calc(64px + safe area)` |
| 7.6 | Home said "Next" twice on the dose card | Title is now the drug and dose; the chip carries the status |
| 7.7 | `navigator.vibrate` warning before the user had tapped | Vibrate only after `userActivation.hasBeenActive` |
| 7.9 | "Bed 7" broke across two lines on the hospital card | `whitespace-nowrap` on the bed number |
| 7.8 | Similar cases and Family were inside the AI and Share files | Split into `screens/similar/` and `screens/family/` to match the plan's folder layout |

## 8. Known limits and open items

- **Mock only.** No backend. Camera capture uses the file input plus a simulated shutter; edge detection, blur and BMDC checks are mocked as the plan says.
- **Dev-panel events are English.** Notifications created by the Dev panel (admit, discharge, emergency) are not translated. Product screens are.
- **Bangla review.** The Bangla text was written for plain, warm tone, but a native-speaker review is still needed, especially for medical terms.
- **Open items from plan.md stay on their ⚠️ defaults:** English digits in Bangla mode, QR access length, Free/Premium limits, bKash/Nagad/card, 30-day deletion grace, BMDC `A-` rule, allergy-only drug checks.
- **Accessibility** was built in (labels, focus ring, 48 px targets, roles, live regions) but not audited with a screen reader.
- **Real-device checks still to do:** install on Android and iPhone; push notifications; Screen Wake Lock (works in Chrome on Android, not in every browser, and the QR screen says so).

## 9. How to run

See [README.md](README.md). Short version: `npm install`, `npm run dev`, open a phone-sized window, OTP `123456`, PIN `1234`.

---

## 10. Web app pass (26 Nov 2026)

Request: "make it webapp". Read as: make it work properly on laptop and desktop screens, not only inside a phone-width column. Mobile stays exactly as before.

**Layout by width**

| Width | Navigation | Content |
|---|---|---|
| Under 768 px (phone) | Top bar + 64 px bottom nav, raised Upload | Full width, 16 px margins, bottom sheets |
| 768–1023 px (tablet) | Same as phone | 24 px margins, 768 px reading column, sheets open as centred dialogs |
| 1024 px and up (desktop) | 248 px white left sidebar (theme prompt): brand, Upload button, every Menu item, unread badge; active item primary-50 + primary-700 + 3 px blue bar. Bottom nav hidden | 32 px padding, content up to 1200 px; forms and lists keep a 768 px reading column |

**Screen changes**

| Screen | Desktop change |
|---|---|
| H17 Home | Two columns: dose card, hospital card, quick actions and prompts on the left; recent activity on a 380 px right column. Header shapes keep their proportions (`xMaxYMid slice`) |
| H44 Similar results | Case cards in a grid: 2 columns on tablets, 3 on wide screens |
| H3 Welcome | Own full-width layout: 3D scene on the left, text and controls in a 440 px column on the right. Camera pulled back for wide canvases |
| A. Onboarding and auth | Brand panel on the left (logo, line art, one line on privacy); the form column on the right |
| Sheets (H52, H60, urgent review, zoom) | Bottom sheet on phones; centred 560 px dialog from 768 px |
| Action bars, chat composer, toasts, Dev button | Sit above the bottom nav on phones; at the bottom edge on desktop |

**Files changed:** `app/Layout.tsx` (Sidebar, AppLayout, BareLayout, new WideLayout), `app/routes.tsx` (Welcome moved to WideLayout), `components/ui.tsx` (`Screen` gets `wide`, ActionBar), `components/overlays.tsx`, `dev/DevPanel.tsx`, `index.css` (`.app-col` moved into `@layer components` so `lg:` utilities can override it), `screens/home/Home.tsx`, `screens/similar/Similar.tsx`, `screens/ai/Ai.tsx`, `screens/onboarding/Welcome.tsx`, `three/recordScene.ts`.

**Tested** at 1440 × 900, 1024 × 768 and 390 × 844 (auth, Welcome, Home, Record, Similar results, Reminder setup, profile switcher): no horizontal scroll, no console or page errors. Build passes; Bangla still 806 of 806.

**Fixed during this pass**

- `.app-col` was unlayered CSS, so it beat Tailwind's `lg:max-w-none`. Moved into `@layer components`.
- On desktop the Welcome stack filled the canvas and was clipped on the left, because the wide canvas kept the phone camera distance. The camera now sits further back when the canvas is wider than tall.
- A 40 px Welcome heading was tried and removed: it is outside the theme's type scale (Display is 28 px).

The PWA still installs on desktop Chrome and Edge from the address-bar icon and opens in its own window.

---

## 11. Home redesign: 3D body explorer (26 Nov 2026)

Request: the Home page was "too minimal and simple"; the user wanted animation, 3D and interactive elements, with a Healix-style medical dashboard as the reference (3D anatomy in the centre, patient card with QR on the left, vitals with charts, a detail panel on the right joined by a line).

**Deviation from the design system, at the user's request.** The theme prompt says "no decorative animation" and "flat". The Home page now has a 3D figure, a dotted stage, sparkline area fills and a fresnel (rim-lit) shell. Everything else in the theme stays: tokens, type scale, status = colour + icon + word, one primary button (Taken). Safety rules stay: the next-dose card and the allergy strip never animate, and Taken is instant.

**Layout**

| Width | Order |
|---|---|
| Desktop (1024 px and up) | Greeting band with date, dose count and quick-action pills, next-dose card on the right · three columns: profile card + vitals (300 px) / 3D body (sticky) / area panel (340 px), joined by a dashed connector line · documents in progress and profile prompts / recent activity |
| Phone | Greeting, pills, next dose · 3D body · area panel · profile card · vitals in a swipeable row · prompts · activity |

**New files**

| File | What it does |
|---|---|
| `src/three/bodyScene.ts` | Procedural see-through figure (lathe torso, capsule limbs) with a fresnel shader shell and organs inside (brain, eyes, lungs, heart, pancreas, kidneys, a blood vessel). Orbit ring, dotted floor, three satellites on the ring. Drag to turn with inertia, zoom, reset, auto-rotate. Projects each hotspot to screen px every frame. A depth prepass removes the seams where see-through parts overlap. Renders only while something moves and stops off screen or in a hidden tab |
| `src/screens/home/bodyAreas.ts` | Maps record items, test series and medicines to 7 body areas by keyword. Area status: Out of range (a latest result outside range), Condition (a known condition), Normal. Only areas with data appear |
| `src/screens/home/BodyExplorer.tsx` | Stage with hotspot buttons over the canvas (keyboard and screen reader friendly; label = area, status word, item count), pause/zoom/reset controls, "Drag to turn" hint, arrow keys turn. Turning pauses while the mouse is over the stage or focus is inside, so markers are not moving targets. Flat SVG figure while Three.js loads or without WebGL |
| `src/screens/home/HomePanels.tsx` | `AreaPanel` (title, status, lead result with count-up and sparkline, findings with source labels, medicines, document thumbnails, Open in record, Ask AI; content cross-fades on change), `ProfileCard` (facts, allergy strip, mini QR + My QR + Share), `VitalCard` (count-up value, status chip, sparkline, change since last) |
| `src/components/Sparkline.tsx` | Smooth trend line with the normal range band and an area fill; draws itself with anime.js; red last point when out of range |

**Data:** added a systolic blood pressure series for Arif (in range) and Rahima (152 mmHg, out of range) so the heart area has a trend. `store.tsx` now merges new seed test series into saved data, so existing sessions get them without a reset.

**Motion added:** figure rises in and the ring opens (1.2 s, once); slow auto-turn with a pause button; selected organ glows and breathes while turning; selected hotspot ping; panel cross-fade; sparklines draw; numbers count up; Home blocks enter once (not on scroll). Reduced motion: no auto-turn, no intro, no ping, lines and numbers shown at once.

**Tested** at 1920 × 1000 (Rahima), 1440 × 900 (Arif) and 390 × 844 (Rahima): hotspot click changes the panel and the connector, no horizontal scroll, no console or page errors. Bangla 831 of 831.

**Fixed during this pass**

- Overlapping transparent body parts showed seams at every joint (mannequin look): depth prepass.
- Auto-rotating markers could not be clicked reliably: turning pauses on hover and focus.
- Phone: zoom controls covered head markers; moved to a bottom row on phones.
- Panel status chip squeezed the title; medicine chips wrapped badly; "My QR" wrapped in the profile card; "1 doses due today": all relaid out or reworded.
- Brain shape read as a helmet visor: lighter and smaller.

---

## 12. My Record redesign (26 Nov 2026)

Second page in the "fix the UI one by one" pass, styled to match the new Home.

**New file:** `src/screens/record/RecordOverview.tsx` (moved out of `Record.tsx`, which keeps the section, test, document, edit, timeline, admission and manual-entry screens). Used by H26 and by the doctor view J4.

| Block | What it does |
|---|---|
| Health passport | Name, age, sex, date of birth, blood-group badge, allergy strip (never animated), Timeline and Add actions |
| Completeness ring | Share of 8 key items present (blood group, conditions, medicines, tests, vaccinations, vitals, doctors, lifestyle). The ring draws with anime.js and the number counts up |
| Stat tiles | Records, documents, medicines, test results, with count-up numbers |
| Body-area chips | Same areas and status words as the Home body map (colour + icon + word) |
| Section cards | Grid (1 / 2 / 3 columns). Each card: icon, count, latest entry with source label. Test results show how many are out of range and a sparkline; Medicines shows the next dose. A soft primary-50 spotlight follows the pointer (`.spotlight` in `index.css`); the icon tile turns blue on hover |
| Trends | Every test series as a VitalCard; swipeable row on phones, 3 columns on desktop |
| Recent | Last 5 events; the connecting line draws down once on load |
| Add this? | Missing key sections, as before |

**Also changed:** J4 doctor view uses the wide layout so its header lines up with the record; the access countdown shows days when more than 24 hours are left.

**Tested** at 1440 × 900 and 390 × 844, plus the doctor view: no horizontal scroll, no errors. Bangla 838 of 838.

**Fixed during this pass:** the four stat tiles were squeezed beside the ring on phones (text ran vertically); they now take a full-width row below 640 px.

---

## 13. Real anatomical body on Home (26 Nov 2026)

Request: replace the stylised figure with "this exact human body" from the reference images (Healix and Eduverse dashboard concepts, and a Zygote Body render).

**What was possible.** Those exact figures are other people's copyrighted renders and models (Zygote Body is a commercial product; the dashboards are studio concepts), so they were not copied. Instead the app now renders a real anatomical model with the same look: every skeletal muscle in deep red, with bones and tendons in ivory.

**Model:** [lucgrn3/anatomy-models](https://github.com/lucgrn3/anatomy-models): `muscles.glb` (552 muscles, 636k triangles, 3.9 MB) and `bones.glb` (240 bones, 398k triangles, 2.3 MB), glTF 2.0 with meshopt compression. **Licence CC BY-SA 4.0**, derived from Z-Anatomy, BodyParts3D, NIH 3D and CC BY 4.0 Sketchfab models. Files are unchanged in `public/models/anatomy/`, with `LICENSE`, `LICENSE-slicer.txt`, `credits.json` and a `README.md` crediting the sources. The credit also shows in the app under About and legal (S16). ShareAlike applies to the model files, not to the app's own code.

**How it renders** (`src/three/bodyScene.ts`, rewritten; same API as before):

- GLTFLoader + MeshoptDecoder; loading shows "Loading 3D body N%" over the flat figure while the ring turns.
- Each of ~800 parts is dequantised, baked into world space and merged by material: base muscles, bones, and one muscle mesh per body area. About ten draw calls instead of ~800.
- Muscles claim an area when their centre is within 8.5 cm (front view) of the area's hotspot. The selected area glows warm red and breathes while turning.
- Materials: MeshPhysicalMaterial. Muscle `#8e2a22`, clearcoat 0.35, sheen 0.7. Bone `#e9dcc6`. Studio light from `RoomEnvironment` (intensity 0.55), key light and a cool rim light, ACES tone mapping at exposure 0.95.
- Scale: 1.71 m body → 3.9 scene units, feet on the orbit ring. Hotspots are now anatomical positions in metres (`bodyAreas.ts`), taken from the model's index (+Y up, +Z front, left = +X).
- If the model fails to load, or WebGL is missing, the flat figure with the same hotspots stays.

**Offline:** the `.glb` files are not precached (they would add 6 MB to every install). A CacheFirst runtime rule (`anatomy-models`) stores them on first view of Home, so later visits and offline use load from the cache.

**Tested** at 1920, 1440 and 390 px wide: model loads, hotspots sit on the right muscles, selecting Heart lights the left chest, no errors. Bangla 840 of 840.

**Tuning during this pass:** the first render was a washed-out salmon colour; darker base, lower environment light and exposure fixed it. The blue selection glow turned pink on red muscle; it is now a warm red glow. Brain and eye markers overlapped; moved apart.

**Trade-off to know:** about 1 million triangles. Fine on laptops and recent phones; it only renders while moving, but older low-end phones may stutter while turning. A lighter muscles-only or decimated version can be added for small screens if needed.

## 14. Home greeting band: glassmorphism hero (2026-11-26)

**Request:** the greeting band ("Good morning, Arif" + quick pills + next dose) looked too ordinary; make it modern glassmorphism.

**What changed**
- New `src/screens/home/HeroBand.tsx` replaces the inline greeting band in `Home.tsx`.
  - Backdrop: three blurred aurora blobs (primary-600, success-border, primary-100 via `color-mix`) drifting on CSS keyframes, wrapped in `data-depth` divs so the existing GSAP scroll parallax still works; a masked dot grid; a heartbeat (ECG) line that anime.js traces on a loop (`svg.createDrawable`, draw `0 0.08 → 0.92 1`); a soft glow that follows the pointer (CSS vars `--hx/--hy`, no React renders).
  - Content: glass date pill with a live clock; greeting is now the page `h1`, words rise out of a mask (GSAP timeline), the name uses a blue→green gradient; stat chips (doses today, results to review or "All in range", documents) with CountUp; quick actions are glass tiles with gradient icon squares that lift on hover.
- `NextDose` is now a frosted glass card with a "Next dose · in 17 min / overdue" eyebrow and a live dot. **The card and its Taken/Snooze buttons still never animate** (safety rule).
- `src/index.css`: new `.hero-aurora`, `.blob*`, `.hero-grid`, `.hero-glow`, `.glass`, `.glass-strong`, `.glass-sheen`, `.glass-pill`, `.pill-icon`, `.text-gradient`, `.live-dot`. Glass falls back to solid white without `backdrop-filter` support and under `prefers-reduced-transparency`; all loops stop under reduced motion.
- Bangla: 10 new strings, 847/847 translated.

**Checked:** `tsc -b` clean; screenshots at 1640, 1440 and 390 px, no console errors, no horizontal overflow.

## 15. My Record: glass + neumorphism + skeuomorphism (2026-11-26)

**Request:** `/record` looked classical and simple; make it modern and 3D, combining glassmorphism, neumorphism and skeuomorphism, with images, diagrams and charts.

**What changed (`src/screens/record/RecordOverview.tsx`, also used by the doctor view J4)**
- **Aurora backdrop** behind the top of the page (shared `.hero-aurora` blobs + dot grid) so the glass panels have colour to blur.
- **Health passport card (skeuomorphic):** credit-card-ratio ID card with a guilloché security pattern, a gold chip, an embossed name, a blood-drop badge, a stable card number (`MG 1234 5678`, hashed from the profile id), a faint ECG line and a real QR code. It tilts in 3D toward the pointer, and a holographic sheen follows the pointer. On load it rises in with a 3D flip (GSAP).
- **Allergy strip** sits under the card, outside the tilt. It never animates (safety rule).
- **Neumorphic dial panel:** an extruded disc with tick marks, and a pressed-in centre. A gradient arc sweeps to the completeness value (anime.js). Four pressed-in stat tiles have glossy skeuomorphic icons. The Test results tile shows "N out of range" in red.
- **Body systems:** glass chips, each with a glossy icon, a colour dot and a status word.
- **Section cards:** glass cards that tilt toward the pointer (`useTilt`), with glossy icon tiles, a large count, a raised arrow button and a frosted inner panel for the latest entry.
- **Insights row:**
  - "Record makeup" donut (recharts, token colours) with a pressed-in centre total and a legend.
  - Trend cards are now glass with the sparkline sunk into a neumorphic well, plus a delta pill.
- **Recent timeline:** glass panel, a gradient spine, glowing glossy nodes, and a page thumbnail for documents.
- **Right column:** "Add this?" (neumorphic rows) when sections are missing; otherwise a **Documents** gallery of paper tiles that lift on hover.

**New shared pieces**
- `src/lib/tilt.ts`: `useTilt(ref, maxDeg)`. It writes `--rx/--ry/--sx/--sy`, and is off on touch-only devices and under reduced motion.
- `src/index.css`: `.neu`, `.neu-inset`, `.neu-press`, `.skeuo-icon`, `.tilt` (+ `.pop`, `.pop-sm`), `.passport`, `.passport-guilloche`, `.passport-holo`, `.passport-chip`, `.emboss`, `.blood-drop`, `.glow-node`.
- Bangla: 5 new strings, 852/852 translated.

**Checked:** `tsc -b` clean; full-page screenshots at 1640, 1280 and 390 px, no console errors, no horizontal overflow.

## 16. Record sub-pages: glass / neumorphic / skeuomorphic (2026-11-26)

**Request:** the pages opened from My Record (Conditions and every other section, Current medicines, Trends, Recent, Documents, Timeline, + Add) looked basic; make them ultra modern.

**Structure**
- New `src/components/glass.tsx` holds the shared pieces:
  - `AuroraBackdrop` and `GlassPage`: an aurora wash, with blocks marked `[data-rise]` rising once on load.
  - `GlassHero`: a glass header with a raised back button, glossy icon, eyebrow, H1, actions and a stats row.
  - `NeuStat`: a pressed-in stat tile.
  - `Segmented`: a neumorphic segmented control with `role="radiogroup"` and counts.
  - `TiltCard`: a glass card that tilts toward the pointer.
  - `Panel`: a glass or neumorphic section.
- New `src/screens/record/RecordPages.tsx` holds SectionList, TestDetail, DocumentViewer, Timeline and ManualEntry. They were moved out of `Record.tsx`, which keeps SECTIONS, RecordHeader, EditItem and AdmissionDetail. `routes.tsx` points at the new module.
- `TrendCard` is exported from `RecordOverview.tsx` so it can be reused.
- `TrendChart` now has a gradient area, a smooth line, a dashed grid and an optional `height`.

**Screens**
- **H27 Section list** (`/record/:section`):
  - Hero stats: entries, from doctors/hospitals, AI confirmed, latest.
  - Segmented date and source filters, with counts.
  - Year-grouped tilting cards, each with a pressed-in date badge, tags, source and a document thumbnail.
  - Side panels: a "Who added these" stacked bar, an "Entries by year" bar chart (recharts) and an "Add something new" button.
  - The `tests` section shows summary stats and a grid of glass trend cards.
- **H28 Test detail:**
  - Stats: latest, normal range, change since last, average.
  - "Over time" chart.
  - A semicircle **range gauge**: a green normal band, plus a needle that swings in with GSAP elastic easing. The status is also written out ("Above the normal range").
  - A **range bar** showing past readings as dots.
  - A reading timeline with delta pills and links to the source documents.
- **H29 Document viewer:**
  - A pressed-in stage with a tilting stack of pages.
  - An AI **scan beam** that sweeps on load and on each "Re-read with AI".
  - Read fields with confidence meters, and chips linking to the record items made from them.
  - Actions in a raised panel. Delete still asks first.
- **H31 Timeline:**
  - Hero stats and a type filter (All / Records / Documents / Hospital).
  - A central glowing spine that **fills as you scroll** (ScrollTrigger scrub), with glossy year pills.
  - Cards alternate left and right on desktop and slide in once. On phones, the spine is on the left.
- **H24 + Add:**
  - Six raised type tiles that press in when selected (`role="radio"`).
  - A glass form, plus a sticky **live preview** of how the entry will appear, marked "Entered by you".
  - The allergy clash warning is unchanged.
- **H34 Medicines:**
  - Hero stats: current, doses today, taken today, next dose.
  - The allergy strip (static).
  - A **today ring** (anime.js).
  - A **24-hour schedule rail** with day and night shading, a marker per dose and a live "now" line.
  - Glass capsule cards with a CSS-drawn glossy two-tone pill, plus dose-time chips with sun and moon icons.

**Fix:** the new effect classes (`.glass`, `.neu`, `.skeuo-icon`, `.passport` ...) now sit inside `@layer components`. Unlayered, `.skeuo-icon { position: relative }` beat Tailwind's `absolute`, which pushed the timeline dots off the spine.

**Checked:**
- `tsc -b` clean and `vite build` OK.
- Bangla 889/889.
- Seven routes screenshotted at 1440 and 390 px, with no console errors and no horizontal overflow.

## 17. Add medicine: a four-step builder (2026-11-26)

**Request:** redesign `/record/add?type=medicines`.

**What changed**
- New `src/screens/record/MedicineBuilder.tsx`, rendered by `ManualEntry` when the type is Medicine. The other types keep the generic form.
- **Step 1, What is it?**
  - A name field with autocomplete (`datalist`) and quick-pick glass chips for common medicines.
  - Six drawn form tiles (tablet, capsule, syrup, injection, drops, inhaler) that press in when picked.
  - The allergy check now matches any recorded allergy, not just penicillin: the "-cillin" family or a name match (`allergyClash()`). The warning is a static Note.
- **Step 2, How much?**
  - A pressed-in dose stepper (− / +) with smart steps (1, 5 or 50).
  - A unit selector that changes with the form (mg/mcg/g, ml, units, drops, puffs).
- **Step 3, When?**
  - How often: once to 4 times a day, which pre-fills sensible times.
  - Each dose is an editable glass time chip with a Morning/Afternoon/Evening/Night icon and can be removed.
  - Food rule: before, after or any time.
- **Step 4, Course and reminders:**
  - How long: ongoing, 7 or 14 or 30 days, or 3 months.
  - Start date, and who prescribed it (optional).
  - A Remind me switch and weekday chips.
- **Live preview (sticky on desktop):**
  - A skeuomorphic **pill bottle** (amber for solids, blue for liquids, ribbed cap, highlight, paper label) showing the name, dose, times and food rule. It wobbles in when the name or form changes.
  - The label gets a red ring and an "Allergy" tag on a clash.
  - A plain summary line ("500 mg · twice a day · after food · ongoing").
- **Your day dial:** a 24-hour clock with day and night halves, hour ticks, and a glossy marker plus label for each dose.
- **Data:** `Medicine` gains an optional `form: MedForm`. The saved medicine now stores every dose time, the food rule, the course length (`reminder.durationDays`), the reminder days and who prescribed it.

**Checked:**
- `tsc -b` clean and Bangla 881/881.
- Screenshots at 1440 and 390 px, with no errors or overflow.
- End-to-end test:
  - An empty submit shows the error.
  - Losartan, 3 times a day, 14 days saves `times ["08:00","14:00","20:00"]` and `durationDays 14`, and appears on /medicines.


---

## 18. Redesign pass summary (26 Nov 2026)

This section summarises sections 11 to 17 for anyone picking up the code. Everything below is in commit "Redesign Home and My Record…" on branch `health-profile-frontend`.

### 18.1 What the user asked for, in order

1. Home was "too minimal and simple". Add animation, 3D and modern interactive features (reference: Healix). See section 11.
2. Redesign My Record. See section 12.
3. "This exact human body". A real anatomical model replaces the procedural figure. See section 13.
4. The Home greeting band was "too normal". Make it extraordinary glassmorphism. See section 14.
5. My Record should be modern and 3D, combining glassmorphism, neumorphism and skeuomorphism. See section 15.
6. Every page opened from My Record should be "ultra modern": sections, Trends, Recent, Documents, Timeline, + Add and Current medicines. See section 16.
7. The Add medicine page. See section 17.

### 18.2 The visual system (one set of rules, reused everywhere)

**Layers**
| Layer | What it is |
|---|---|
| Backdrop | Blurred aurora blobs drifting on CSS keyframes, a masked dot grid, a fade to the page colour. It exists so glass has colour to blur. |
| Glassmorphism | Frosted panels, headers and cards. |
| Neumorphism | Raised or pressed surfaces on the page colour: stat tiles, dials, segmented controls, steppers, type tiles. |
| Skeuomorphism | Glossy lit icon tiles, the health-passport ID card, the pill bottle, CSS capsules, the gauge needle, drawn medicine-form glyphs. |
| 3D | Pointer tilt on cards (`useTilt`), the anatomy model on Home (Three.js), the 3D flip-in of the passport, and a stack of document pages. |

**Shared classes in `src/index.css`.** All of them live inside `@layer components`, so Tailwind utilities still override them.

| Group | Classes |
|---|---|
| Backdrop | `.hero-aurora`, `.blob`, `.blob-a/b/c`, `.hero-grid`, `.hero-glow` |
| Glass | `.glass`, `.glass-strong`, `.glass-sheen`, `.glass-pill`, `.pill-icon`, `.text-gradient`, `.live-dot` |
| Neumorphism | `.neu`, `.neu-inset`, `.neu-press` |
| Skeuomorphism | `.skeuo-icon`, `.passport`, `.passport-guilloche`, `.passport-holo`, `.passport-chip`, `.emboss`, `.blood-drop`, `.glow-node` |
| Tilt | `.tilt`, `.is-tilting`, `.pop`, `.pop-sm` |

**Shared code**
| File | What it gives |
|---|---|
| `src/lib/tilt.ts` | `useTilt(ref, maxDeg)`. Writes `--rx/--ry/--sx/--sy`. Off on touch-only devices and under reduced motion. |
| `src/components/glass.tsx` | `AuroraBackdrop`, `GlassPage`, `GlassHero`, `NeuStat`, `Segmented`, `TiltCard`, `Panel`. |
| `src/components/Sparkline.tsx` | A line drawn with anime.js, a normal-range band and an out-of-range dot. |
| `src/components/TrendChart.tsx` | Gradient area, smooth line, dashed grid, optional height. |

**Colours.** Only the theme tokens are used, mixed with `color-mix(in oklab, …)`. Hex values that appear in SVG and recharts are token values.

### 18.3 Motion and libraries, by job

| Library | Used for |
|---|---|
| GSAP + ScrollTrigger (`@gsap/react`, `gsap.matchMedia`) | Entrances (`[data-rise]`, `[data-enter]`), the hero word reveal, the passport flip, the gauge needle (elastic), the document scan beam, the bottle wobble, and the Timeline spine fill with ScrollTrigger scrub. |
| anime.js v4 | Ring and dial sweeps (completeness, doses today), sparkline drawing, the hero heartbeat line (`svg.createDrawable`, loop). |
| Three.js 0.187 | The anatomy model on Home. Lazy-loaded; renders only while something moves. |
| recharts | Record makeup donut, Entries by year bars, the test trend chart. |
| CSS keyframes | Aurora drift, live-dot ping. |

### 18.4 Safety and accessibility rules kept

- **Never animated or tilted:** the allergy strip, the next-dose card, its Taken and Snooze buttons, confirm dialogs and allergy warnings.
- **Status:** always colour, icon and word together. The gauge also says "Above/Below/Inside the normal range" in words.
- **Reduced motion:** every loop, tilt and entrance is behind `prefers-reduced-motion: no-preference`, and glass falls back to solid white without `backdrop-filter`. Under `prefers-reduced-transparency`, glass also turns solid.
- **Headings:** one H1 per screen.
- **Choices:** segmented controls and type tiles use `role="radio"` with `aria-checked`, and the reminder switch uses `role="switch"`.
- **Charts:** each has an `aria-label` or a text summary.
- **Touch targets:** ≥ 40–48 px.

### 18.5 File map of this pass

| File | Status | Role |
|---|---|---|
| `src/three/bodyScene.ts` | new | Three.js anatomy scene: glTF + meshopt, merge by material/area, physical materials, orbit, hotspots via `onFrame`. |
| `src/screens/home/BodyExplorer.tsx` | new | Canvas, hotspot buttons, controls, loading %, flat fallback. |
| `src/screens/home/bodyAreas.ts` | new | Body areas, positions, status per area. |
| `src/screens/home/HomePanels.tsx` | new | AreaPanel, ProfileCard, VitalCard. |
| `src/screens/home/HeroBand.tsx` | new | Glass greeting band (aurora, ECG trace, pointer glow, stats, quick actions). |
| `src/screens/home/Home.tsx` | changed | New three-column layout, connector line, NextDose in glass. |
| `src/screens/record/RecordOverview.tsx` | new | My Record: passport card, dial, body systems, section cards, makeup donut, trends, timeline, documents. Also used by the doctor view J4. |
| `src/screens/record/RecordPages.tsx` | new | Section list (H27), Test detail (H28), Document viewer (H29), Timeline (H31), Manual entry (H24). |
| `src/screens/record/MedicineBuilder.tsx` | new | Four-step Add medicine with bottle preview and 24-hour dial. |
| `src/screens/record/Record.tsx` | changed | Keeps SECTIONS, RecordHeader, EditItem, AdmissionDetail. |
| `src/screens/medicines/Medicines.tsx` | changed | H34 list: today ring, 24-hour schedule rail, capsule cards. |
| `src/components/glass.tsx`, `src/lib/tilt.ts`, `src/components/Sparkline.tsx` | new | Shared pieces (18.2). |
| `src/components/TrendChart.tsx` | changed | Gradient + smooth line. |
| `src/index.css` | changed | Visual system classes (18.2). |
| `src/mock/types.ts` | changed | `Medicine.form?: MedForm`. |
| `src/mock/seed.ts`, `src/state/store.tsx` | changed | BP tests; migration adds new seed tests to saved state. |
| `src/app/routes.tsx` | changed | Record sub-pages now load from `RecordPages`. |
| `src/screens/settings/Settings.tsx` | changed | About: 3D anatomy model credit (CC BY-SA 4.0). |
| `vite.config.ts` | changed | Runtime CacheFirst for `/models/*.glb`. |
| `public/models/anatomy/` | new | `muscles.glb` (3.9 MB), `bones.glb` (2.3 MB), `LICENSE`, `LICENSE-slicer.txt`, `credits.json`, `README.md`. |
| `src/i18n/bn.json`, `en.json` | changed | 881 strings, all translated. |

### 18.6 How it was checked

- **Build:** `npm run build` (tsc -b + Vite + PWA) passes, and the precache is 43 entries.
- **Bangla:** `node scripts/i18n-check.mjs` reports 881/881 translated.
- **Screenshots:** headless Edge (playwright-core, swiftshader) at 1920, 1640, 1440, 1280 and 390 px, for Home, My Record and the seven sub-pages (`/record/conditions`, `/record/tests`, `/record/tests/t1`, `/documents/d1`, `/timeline`, `/record/add`, `/medicines`). Each had no console errors and no horizontal overflow.
- **End-to-end:**
  - An empty Add medicine submit shows the error.
  - A full submit saves times, food, course length and reminder days, then shows on /medicines.
  - Hotspot clicks on the 3D body update the side panel.

### 18.7 Known limits after this pass

- **3D model weight:** about 1M triangles and about 6 MB, cached after the first view. It may stutter on low-end phones. A lighter muscles-only version for small screens is a possible next step.
- **Licence:** the model is CC BY-SA 4.0 (Z-Anatomy / BodyParts3D via lucgrn3/anatomy-models). Attribution is in `public/models/anatomy/` and Settings → About. Any change to the model files must stay CC BY-SA.
- **Not covered by the new look:** EditItem (H30) and AdmissionDetail (H32) still use the earlier card style.
- **Medicine form icon:** `form` is stored but not shown yet on /medicines (capsule colour cycles by index).
- **Tilt:** mouse only. On touch, cards stay flat by design.
- **Pages not yet redesigned:** Ask AI, Medicine detail and reminders, Similar cases, Share, Family, Notifications, Settings.
