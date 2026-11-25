# MedGuard AI: UI theme prompt for all 4 apps

One light, bluish design system, identical across the Health Profile app, Ward app, Ward Dashboard and Admin Console. Copy everything from PROMPT START to PROMPT END into any AI design tool, or hand it to a designer, then add the screen you want using its ID from the Miro board (for example: “Design W41 Give dose”).

## PROMPT START

You are designing screens for MedGuard AI, a healthcare product used in Bangladeshi hospitals by nurses, doctors, ward managers and hospital admins, and at home by patients and their families. A confusing screen can lead to a wrong dose or a missed fall, so clarity always beats decoration. Follow this design system exactly, for every screen in all four apps.

### 1. The four apps

| App | Screen IDs | Users | Device | Navigation |
| --- | --- | --- | --- | --- |
| 1. Health Profile app | P1 to P84 | Patients, families, outside doctors | Phone, 360 to 430 px wide | Bottom bar: Home, My Record, Upload (centre, raised), Ask AI, Menu. Profile switcher at the top of every screen |
| 2. Ward app | W1 to W71 | Nurses, doctors, senior nurses | Phone, tablet and ward PC | Phone: bottom bar Home, Patients, Command (centre, microphone), Alerts, Me. Tablet (768 px and up) and PC (1024 px and up): the same items in a left sidebar. Top bar always shows ward, shift time left, sync status and who is logged in |
| 3. Ward Dashboard | D1 to D21 | Ward manager, admission desk | Desktop, 1280 to 1920 px | Left sidebar 248 px; alerts panel slides in from the right, 360 px |
| 4. Admin Console | A1 to A13, M1 to M12 | Hospital admin, MedGuard team | Desktop, 1280 px and up | Left sidebar 248 px; mostly tables and forms |

**One theme for all four apps.** The Health Profile app, Ward app, Ward Dashboard and Admin Console use exactly the same colours, fonts, icons, spacing, components and states. No app gets its own accent colour or style. Only the layout changes, to fit the device (phone, tablet or desktop). A patient, a nurse and an admin should all recognise MedGuard at a glance.

### 2. Look and feel

- Light theme only. No dark mode.
- Calm, clean, clinical, trustworthy, and bluish: white cards on a very light blue-grey page.
- Blue means brand and action. Every other colour means a status (danger, warning, success). Never use colour for decoration.
- Flat: cards have a thin border, not a shadow. Shadows only on things that float: bottom sheets, menus, dialogs, sticky bars.
- No gradients, glass effects, stock photos of patients, decorative emojis or busy illustrations. Simple blue line illustrations only in empty states and onboarding.
- Generous white space and big, readable text. Users may be tired, wearing gloves, on a small screen, in poor light.

### 3. Colours

Every text colour below passes WCAG AA (4.5:1) on the background it is paired with.

**Brand blue**

| Token | Hex | Use |
| --- | --- | --- |
| primary-700 | #174C99 | Pressed buttons, text on blue tints (6.6:1 on primary-100), sidebar active text |
| primary-600 | #1D5FBF | Main buttons, links, active tab, focus ring (6.1:1 on white) |
| primary-100 | #D6E6FB | Selected rows, selected chips, active nav pill |
| primary-50 | #EAF2FD | Info banners, tinted panels, table row hover, normal-range band on charts |

**Neutrals**

| Token | Hex | Use |
| --- | --- | --- |
| page | #F5F8FC | Page background behind cards |
| surface | #FFFFFF | Cards, sheets, dialogs, top bars, sidebars |
| ink-900 | #0F1B2D | Main text, titles (17:1 on white) |
| ink-700 | #475467 | Secondary text, labels (7.7:1) |
| ink-500 | #5B6B80 | Hints, placeholders, timestamps (5.4:1); never for doses, names or allergies |
| border-input | #7B8BA1 | Input and checkbox borders (3.5:1, meets the 3:1 rule for controls) |
| border-subtle | #E3E9F1 | Card borders, dividers, skeleton loaders |

**Status colours** (text on its own background tint)

| Status | Text / icon | Background | Border | Used for |
| --- | --- | --- | --- | --- |
| Danger | #B42318 | #FEF3F2 | #FDA29B | Overdue, missed, allergy strip, errors, destructive buttons |
| Critical alarm | #FFFFFF on solid #B42318 | #B42318 | none | Fall alarm full screen only (6.6:1) |
| Warning | #B54708 | #FFFAEB | #FEC84B | Due now, awaiting approval, offline banner |
| Needs check (AI) | #93370D | #FEF0C7 | #FEC84B, dashed | Low-confidence AI fields, “AI read: check this” tags |
| Success | #067647 | #ECFDF3 | #75E0A7 | Given, confirmed, synced, verified |
| Info | #1D5FBF | #EAF2FD | #D6E6FB | Tips, next dose, neutral notices |
| Neutral | #344054 | #F2F4F7 | #E3E9F1 | Held, out of service, archived |

Colour is never the only signal: every status also has an icon and a word (for example a red clock icon plus the word “Overdue”).

### 4. Typography

- Fonts: Noto Sans for English and Noto Sans Bengali for Bangla. They match, so mixed text looks consistent. Fallback: system-ui.
- Numbers: tabular (fixed-width) figures for doses, times, vitals and bed numbers so columns line up.

| Style | English (size / line) | Bangla (size / line) | Weight | Use |
| --- | --- | --- | --- | --- |
| Display | 28 / 36 px | 28 / 40 px | Bold | Home greeting, big numbers on dashboards |
| H1 | 24 / 32 px | 24 / 36 px | Semibold | Screen title, one per screen |
| H2 | 20 / 28 px | 20 / 32 px | Semibold | Section title |
| H3 | 18 / 26 px | 18 / 30 px | Semibold | Card title, patient name |
| Body | 16 / 24 px | 17 / 28 px | Regular | Default text |
| Body strong | 16 / 24 px | 17 / 28 px | Semibold | Drug names, doses, key values |
| Small | 14 / 20 px | 15 / 24 px | Regular | Secondary details, desktop table cells |
| Caption | 12 / 16 px | 13 / 20 px | Regular | Timestamps and source labels only |

- Patient name, drug name, dose and allergies are always at least 16 px semibold.
- Bangla text runs longer and taller: leave room for about 30% more width, and never go below 13 px.
- Sentence case everywhere. No ALL CAPS except IDs such as “W41” or “Bed 7”.

### 5. Spacing, layout and shape

- Spacing scale (4 px base): 4, 8, 12, 16, 24, 32, 48, 64. Use nothing else.
- Phone: 16 px side margins, 16 px card padding, 12 px between cards.
- Desktop: 12-column grid, 24 px gutters, 32 px page padding, content up to 1440 px wide.
- Corner radius: 8 px buttons and inputs, 12 px cards, 16 px dialogs and the top of bottom sheets, fully round for status chips and avatars.
- Shadows: sticky bars 0 1px 3px rgba(15,27,45,0.08); sheets, menus and dialogs 0 8px 24px rgba(15,27,45,0.12). Nothing else has a shadow.
- Touch targets: at least 48 x 48 px with 8 px between them. Critical buttons (Give dose, I am going) are 56 px tall.
- Icons: Lucide, outline, 1.75 stroke, 24 px (20 px in dense tables). Icons in navigation and status always come with a text label.

### 6. Components

**Buttons**

- Primary: filled #1D5FBF, white text, pressed #174C99. Only one primary button per screen.
- Secondary: white, 1 px #1D5FBF border, blue text.
- Tertiary: blue text, no border.
- Destructive: filled #B42318, white text. Only for stop, delete and discharge actions, always with a confirm step.
- Height 48 px on phones (full width in forms), 40 px on desktop. Labels are verbs: “Give dose”, “Approve”, “Save”, never “OK” or “Submit”.
- Loading: spinner inside the button and the label stays.

**Inputs**

- Label always above the field; never a placeholder alone.
- 48 px tall, #7B8BA1 border, 8 px radius. Focus: 2 px #1D5FBF border plus a soft blue ring.
- Error: red border, red icon and a message below that says how to fix it.
- Units sit inside the field on the right (mg, mmHg, °C).

**Patient identity header (Ward app, every patient screen)**

- Sticky at the top: photo (48 px), full name (H3), age and sex, a large bed chip (“Bed 7”), patient ID.
- Allergy strip directly below: red tint, warning icon, “Allergies: Penicillin, Sulfa”. If none, a neutral strip says “No known allergies”. Never blank.

**Status chips:** pill shape, tint background, icon plus word: Overdue, Due now, Next, Given, Missed, Held, Awaiting approval, Offline, Verified.

**Dose row (W10 checklist):** time, drug, dose and route (“Insulin 10 units SC”), bed and patient name, status chip, Give button. Overdue rows always sort to the top.

**Alerts, in 3 levels**

1. Critical (fall alarm only): full-screen takeover, solid #B42318, white text. Title 32 px (“Fall: Bed 7”), patient name, time, blurred snapshot. Two 56 px buttons: “I am going” (white with red text) and “False alarm”. Shows the countdown to escalation. Repeating sound plus vibration, and it still works with sound off.
2. High (overdue dose, critical result): banner under the top bar, warning or danger tint, icon, one action. Stays until someone acts. Sound once.
3. Normal: badge on Alerts plus an inbox item. No sound.

Toasts are only for confirmations (“Dose saved”), disappear after 4 seconds, and are never used for errors that need action.

**Offline banner:** under the top bar, warning tint: “Offline. 3 actions waiting to sync”, with a sync icon. Turns green with “All synced” for 3 seconds when back online.

**AI-read content**

- Each AI-extracted field shows an amber “AI read: check this” tag until a person confirms it.
- Low-confidence fields: amber background, dashed amber border, warning icon.
- “View original” opens the source photo beside the fields.
- After confirmation the tag becomes a source label: “Confirmed by Nurse Rina, 8:05 AM”.

**Source label:** caption size with icon: “Uploaded by you, 12 Nov 2026” or “Added by Dr. Karim, Dhaka Medical”.

**Confirm dialogs:** title names the action (“Stop insulin?”), body says the consequence, a reason field appears when needed, Cancel on the left and the action on the right.

**Bottom sheets (phone):** for quick actions such as Give dose, with a grab handle and the main button at the bottom within thumb reach.

**Navigation**

- Bottom bar: 64 px tall, icon plus label always. Active item: blue icon and label on a primary-100 pill.
- Sidebar: 248 px, white. Active item: primary-50 background, primary-700 text, 3 px blue bar on the left.
- Ward app top bar: 56 px, white: ward name, shift time left, sync status (dot plus word), avatar plus name.

**Tables (Dashboard and Admin):** 48 px rows, sticky header, no zebra stripes, primary-50 on hover, sortable headers, filters above, pagination below.

**Charts (vitals, test results):** line charts, normal range as a primary-50 band, out-of-range points in red with their value written beside them, axis labels 14 px ink-700.

**QR screen (P48):** white, QR code at least 280 px, screen brightness to maximum, name and expiry timer underneath.

**States every screen needs:** loading (skeleton blocks in #E3E9F1, never a blank screen), empty (one line plus one action), error (what happened, what to do, Retry), offline, no access, session locked.

### 7. Safety rules (never break these)

1. AI drafts, a person confirms. Nothing the AI reads goes live until a person checks it.
2. Every data item shows its source: who added it and when.
3. Honest camera wording: “Visit seen by camera”, never “Dose verified”.
4. Patient photo, name, age, bed and ID on every patient screen.
5. Allergies always visible at the top; “No known allergies” written, never blank.
6. Anything critical is at most two taps away.
7. Never show status by colour alone: colour plus icon plus word.
8. Only falls take over the screen. Everything else is a banner or an inbox item.
9. Offline is always visible, and nothing is lost silently.
10. Risky actions (stop medicine, discharge, delete, emergency access) need a confirm step and a reason.
11. Everything is logged.
12. Bangla and English are both complete; drug names stay as written.
13. Light, high-contrast theme with adjustable text size.
14. One Ward app that adapts to phone, tablet and PC.
15. Auto-lock: PIN switch on shared devices, fingerprint on personal phones.

### 8. Words and tone

- Patients (App 1): warm, simple, short sentences, no jargon unless explained. Never alarming, except the urgent warning (P39), which is direct: “See a doctor now. Call 999.”
- Staff (Apps 2 to 4): clinical, precise, as short as possible.
- Both languages complete. No text inside images.
- Dates: “25 Nov 2026”. Times: 12-hour with AM/PM (“8:00 AM”); team to confirm.
- Until the team decides open question 1, show doses, vitals and times in English digits, even in Bangla mode.
- Error messages say what happened and what to do next.

### 9. Accessibility

- WCAG 2.2 AA: 4.5:1 for text, 3:1 for icons, borders and large text.
- Text can scale to 200% without breaking layouts.
- Every control has a screen-reader label; focus is always visible (2 px blue ring).
- Respect “reduce motion”. Nothing flashes more than 3 times per second.
- Alarms use sound, vibration and visuals together, never sound alone.

### 10. Motion

- 150 to 200 ms ease-out for small changes, 250 ms for sheets and dialogs.
- No decorative animation. The fall alarm icon may pulse once per second.

### 11. Design tokens (for developers)

```css
:root {
  --primary-700: #174C99;
  --primary-600: #1D5FBF;
  --primary-100: #D6E6FB;
  --primary-50:  #EAF2FD;
  --page: #F5F8FC;
  --surface: #FFFFFF;
  --ink-900: #0F1B2D;
  --ink-700: #475467;
  --ink-500: #5B6B80;
  --border-input: #7B8BA1;
  --border-subtle: #E3E9F1;
  --danger-text: #B42318;  --danger-bg: #FEF3F2;  --danger-border: #FDA29B;
  --warning-text: #B54708; --warning-bg: #FFFAEB; --warning-border: #FEC84B;
  --check-text: #93370D;   --check-bg: #FEF0C7;
  --success-text: #067647; --success-bg: #ECFDF3; --success-border: #75E0A7;
  --neutral-text: #344054; --neutral-bg: #F2F4F7;
  --font: 'Noto Sans', 'Noto Sans Bengali', system-ui, sans-serif;
  --radius-control: 8px;
  --radius-card: 12px;
  --radius-sheet: 16px;
  --shadow-bar: 0 1px 3px rgba(15,27,45,0.08);
  --shadow-float: 0 8px 24px rgba(15,27,45,0.12);
  --s1: 4px; --s2: 8px; --s3: 12px; --s4: 16px; --s6: 24px; --s8: 32px; --s12: 48px; --s16: 64px;
}
```

### 12. Before you hand over a screen, check

- [ ] Same theme as the other three apps: light, blue only for brand and actions
- [ ] Every status has colour, icon and word
- [ ] Text passes contrast; nothing important under 16 px
- [ ] Touch targets at least 48 px
- [ ] Patient identity and allergy strip on every patient screen (Ward app)
- [ ] AI-read fields marked until confirmed
- [ ] Works in Bangla (longer text) and English
- [ ] Loading, empty, error and offline states designed
- [ ] Only one primary button on the screen

## PROMPT END
