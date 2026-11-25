# MedGuard AI — Full UI/UX Plan

Nov 25, 2026 · @bosss urmee

## Decisions so far

MedGuard is two separate apps, a public Health Profile app and a hospital Ward app, plus a Ward Dashboard and an Admin Console. WhatsApp is out of scope for the UI. Every row below is a choice you made in the brainstorm. The rest of this plan is built on them.

| Area | Question | Your decision |
| --- | --- | --- |
| Structure | One app or two? | Two separate apps: Health Profile (public) and MedGuard Ward (hospital) |
| Health Profile | Who checks AI-extracted data? | The user reviews it; no verified/unverified split for personal uploads |
| Health Profile | What sections does a profile have? | Only what the user uploads or mentions. AI prompts to add important missing items; skipping is fine |
| Health Profile | What can be uploaded? | Camera photos (many at once), gallery images, PDFs, manual entry |
| Health Profile | Messy uploads (duplicates, wrong person, unreadable, conflicts) | AI shows each problem and asks the user to resolve it |
| Health Profile | Family | Family profiles under one account, and several relatives can co-manage one profile |
| Health Profile | Login | Phone + OTP, email + password, Google, plus fingerprint/face unlock |
| Health Profile | AI chat | Yes: explains the user's own reports in plain language, no diagnosis |
| Health Profile | Medicine reminders | Yes, with Taken/Skipped log |
| Health Profile | Offline | View profile, reports and reminders offline; uploads and AI need internet |
| Health Profile | Pricing | Free + Premium. Premium: more family profiles, unlimited AI chat, unlimited similar searches, more storage |
| Similar cases | Who sees results? | Everyone sees full results |
| Similar cases | Safeguards | Disclaimer before first results, Share with doctor, outcomes collapsed by default, urgent-sign warning |
| Doctors outside hospitals | Role | Can view a shared profile and add prescriptions/notes |
| Doctors | Verification | BMDC number, auto-check. If it fails, the account stays a normal user account |
| Hospital link | How does a hospital open a profile? | Patient shows a QR code; emergency access for unconscious patients, fully logged |
| Hospital link | After discharge | Hospital data is added to the profile automatically; the user can delete it |
| Bed queue | Scope | One queue per hospital ward |
| Bed queue | Who adds patients? | Admission desk, ward doctor or ward manager |
| Bed queue | Priority | Staff set it; the patient can request urgency from their app; staff decide |
| Ward | Who approves AI-read medicines? | A doctor or the senior nurse (sister-in-charge) |
| Ward | Paper or digital orders? | Both: paper photographed, or typed in the app |
| Ward | Nurse devices | Own phones, shared ward tablets and nurse-station PCs (all three) |
| Ward | Vitals | Manual entry plus voice ("Bed 7 BP 120 by 80") |
| Fall alarm | First recipient | The assigned nurse |
| Fall alarm | Escalation | After 60 seconds unacknowledged: all nurses, ward manager and duty doctor at once |
| Camera | Who sees the live feed? | Ward manager and nurses |
| Manager | Devices | Desktop PC and phone (no wall TV) |
| Shifts | Pattern | Each hospital configures its own shifts and ratios |
| Admin | Who runs the Admin Console? | Split: MedGuard team does cameras and setup; hospital manages staff and beds |
| Language | Default | User picks Bangla or English on first launch; changeable later |
| Theme | Light/dark | Light only |
| Roles | Staff permission tiers | No preference given; a proposed default is in the roles section, marked for your review |

## Product structure

Four front-ends share one Health Profile record per person: the public app builds it, the hospital opens it by QR scan or emergency access, and stay records flow back at discharge.

&#91;embedded content: how the four front-ends connect\]

Patients send urgency requests and see queue status from their app; the ward manager answers them in the dashboard. Cameras send fall alarms and visit events to nurses, and live view and events to the manager.

## Design rules for every screen

These rules apply to all four front-ends. Each one prevents a specific clinical or trust failure.

| # | Rule | What it means on screen | Failure it prevents |
| --- | --- | --- | --- |
| 1 | AI drafts, a person confirms | Ward app: AI-read medicines only become a dose schedule after a doctor or senior nurse approves. Health Profile: the user reviews every extracted field. Low-confidence fields are highlighted; the original photo is one tap away | Wrong drug or dose entering the schedule |
| 2 | Every data point shows its source | Label on each item: "Uploaded by you", "Added by Dr. X", "From Hospital Y", plus date | Trusting a self-entered or outdated record |
| 3 | Honest camera wording | "Visit seen by camera" never "Dose verified". The nurse taps Given | False assurance a dose was given |
| 4 | Patient identity on every patient screen | Ward app header: photo, full name, age/sex, bed, patient ID. Camera view shows ID only | Wrong-patient errors |
| 5 | Allergies always pinned | Red allergy strip at the top of every profile and every dose sheet; "No known allergies" shown explicitly, never blank | Giving a drug the patient reacts to |
| 6 | Two taps to anything critical | Give dose, acknowledge alarm, show QR: at most two taps from Home. Tap targets at least 48 px; one-hand reach | Delays while gloved or walking |
| 7 | Status = colour + icon + word | "Overdue" is red + clock icon + the word | Colour-blind users, poor screens |
| 8 | Alarm tiers | Critical (fall): full-screen, sound, vibration, needs acknowledgement. High (overdue dose, urgent result): banner + sound. Normal: inbox only | Alarm fatigue hiding real emergencies |
| 9 | Offline is visible | Banner: "Offline. 3 actions waiting to sync". Queued actions listed; conflicts must be resolved, never silently overwritten | Lost or duplicated doses |
| 10 | Dangerous actions need a reason | Stop medicine, discharge, delete a hospital record, override queue, emergency access: confirm + reason field | Accidental or unaccountable changes |
| 11 | Everything is audited | Who created, edited, viewed, shared, and when, including emergency access | Disputes, misuse of records |
| 12 | Language chosen at first launch | Full Bangla and English UI, switchable any time. Drug names stay as written on the prescription | Misreading medical terms |
| 13 | Light theme, high contrast | Single light theme; text meets WCAG AA contrast; adjustable text size; screen-reader labels on every control | Unreadable screens for older users |
| 14 | Responsive Ward app | One Ward app with phone, tablet and PC layouts (nurses use all three) | Separate apps drifting apart |
| 15 | Session safety | Auto-lock after inactivity; quick PIN switch on shared tablets and PCs; biometric unlock on own phones | Another person acting under your name |

## MedGuard Health Profile app

The public app has 68 screens across 12 areas, plus the shared settings and states in the shared section. Anyone can use it: a person managing their own health, a family caregiver, or a private chamber doctor after BMDC verification.

**Bottom navigation (5):** Home · My Record · Upload (centre, large +) · Ask AI · Menu. A profile switcher sits at the top of every screen (self and family members), always showing whose profile is open.

**Menu holds:** Similar cases, Medicines, Share & access, Family, Notifications, Premium, Settings, Help.

### A. First launch and sign-in (16)

| ID | Screen | What is on it |
| --- | --- | --- |
| H1 | Splash | Logo, loading, offline check |
| H2 | Language | Bangla / English, large buttons |
| H3 | Welcome | 3 slides: build one health record, find similar cases, your data is private. Skip button |
| H4 | Sign in or sign up | Continue with phone, email or Google |
| H5 | Phone number | +880 prefilled, number field, Send code |
| H6 | OTP | 6-digit code, resend timer, change number |
| H7 | Email sign-up | Name, email, password with strength meter |
| H8 | Email login | Email, password, Forgot password |
| H9 | Forgot password | Email entry, then "link sent", then set new password (3 states) |
| H10 | Verify email | Waiting state, resend, open mail app |
| H11 | Consent | Separate checkboxes: terms, privacy policy, health-data processing, AI processing. Each with plain-language summary and link to full text |
| H12 | Account type | "For myself / my family" or "I'm a doctor" (doctor goes to J1) |
| H13 | Create first profile | Name, date of birth, sex, photo (optional), blood group (optional) |
| H14 | Biometric setup | Use fingerprint/face to unlock? Enable / Not now |
| H15 | Notifications permission | Explains why (medicine reminders, access alerts) before the system prompt |
| H16 | App lock | Biometric or PIN unlock on return |

### B. Home (2)

| ID | Screen | What is on it |
| --- | --- | --- |
| H17 | Home | Next medicine reminder; documents still processing; "Complete your profile" AI prompts (each dismissible); quick actions: Upload, Show my QR, Ask AI, Similar cases; recent activity |
| H18 | Home, admitted or waiting | Adds a hospital card: hospital, ward, bed, admitted since. If on a waiting list: hospital, status, and a "Request urgent review" button (sends to ward staff with a reason; staff decide) |

### C. Upload and AI extraction (7)

| ID | Screen | What is on it |
| --- | --- | --- |
| H19 | Upload source | Camera, Gallery, PDF, Type it in. Choose which family profile it is for |
| H20 | Camera capture | Multi-page capture, edge detection, page counter, retake, reorder, blur warning |
| H21 | Processing | Per-document progress; user can leave and is notified when done |
| H22 | Issues to resolve | One card per problem: duplicate (keep one), different name found (mine / a family member's / not mine), unreadable (retake), conflicting medicines (which are you taking now?) |
| H23 | Review extracted data | Original image beside extracted fields; low-confidence fields highlighted; edit any field; Confirm all |
| H24 | Manual entry | Add a condition, allergy, medicine, vital reading, surgery or vaccination via one form with a type picker |
| H25 | Processing failed | Reason, Retry, Retake photo, Enter manually |

### D. My Record: the unified profile (8)

| ID | Screen | What is on it |
| --- | --- | --- |
| H26 | Record overview | Header (photo, name, age, sex, blood group); allergy strip; sections appear only when they have data (conditions, current medicines, test results, imaging, prescriptions, vitals, surgeries and admissions, vaccinations, family and lifestyle, doctors seen); AI "add this?" prompts for important missing items |
| H27 | Section list | All items in one section, filter by date and type |
| H28 | Test result detail | Value, reference range, trend chart over time, source document |
| H29 | Document viewer | Original image/PDF, extracted data, source label, date; Share, Delete, Re-read with AI |
| H30 | Edit item | Edit form with change history |
| H31 | Timeline | Every event in date order across all sources |
| H32 | Admission detail | Hospital, dates, discharge summary, medicines and results from that stay |
| H33 | Delete hospital record | Warning that doctors may rely on it; reason optional; confirm |

### E. Medicines and reminders (5)

| ID | Screen | What is on it |
| --- | --- | --- |
| H34 | Medicines | Current and past tabs, each medicine with dose and next time |
| H35 | Medicine detail | Dose, timing, before/after food, prescribed by, start and end date, source document |
| H36 | Reminder setup | Times, days, duration, sound; caregivers notified on missed doses (toggle) |
| H37 | Reminder action | Opened from the notification: Taken / Skip (reason) / Snooze |
| H38 | Taken log | Calendar of taken, skipped and missed doses per medicine |

### F. Ask AI (2)

| ID | Screen | What is on it |
| --- | --- | --- |
| H39 | Chat | Scoped to the open profile; suggested questions; answers name the report they come from; "talk to a doctor" note when a question needs one; free-plan counter |
| H40 | Chat history | Past conversations, search, delete |

### G. Similar cases (6)

| ID | Screen | What is on it |
| --- | --- | --- |
| H41 | Disclaimer | Shown before the first search: not a diagnosis, published cases may differ from you. Must accept |
| H42 | Search setup | Which profile details to use (toggle conditions, results, medicines); free-plan counter |
| H43 | Urgent-sign warning | Shown above results if the profile has danger signs: "See a doctor now", call 999, nearest hospital |
| H44 | Results | Cases with match reasons, age, sex, main condition; outcome collapsed |
| H45 | Case detail | Summary, treatment, outcome behind "Show outcome", source citation, Share with doctor, Save |
| H46 | Saved cases | List of saved cases per profile |

### H. Share and access (5)

| ID | Screen | What is on it |
| --- | --- | --- |
| H47 | My QR code | Full-screen QR, brightness up, expiry timer, used for hospital admission and doctors |
| H48 | Share with a doctor | Pick a doctor or create a link; duration; which sections |
| H49 | Who has access | Hospitals, doctors and caregivers with access now; Revoke |
| H50 | Access log | Every view and edit, by whom, when; emergency access marked |
| H51 | Emergency access notice | Which hospital, who, when, stated reason; Report misuse |

### I. Family and caregivers (5)

| ID | Screen | What is on it |
| --- | --- | --- |
| H52 | Profile switcher | Sheet listing self and family profiles |
| H53 | Family | All profiles the account manages, with plan limits |
| H54 | Add family member | Create a new profile, or link an existing one by invitation |
| H55 | Caregivers | Invite by phone; permission View only or Manage; remove |
| H56 | Caregiver invitation | Accept or decline managing someone's profile |

### J. Doctor mode (6)

| ID | Screen | What is on it |
| --- | --- | --- |
| J1 | BMDC verification | Name and BMDC number, auto-check result; if it fails the account stays a normal user account, with retry |
| J2 | Doctor home | Patients who shared with me, Scan QR, recent patients |
| J3 | Scan QR | Camera scanner, access duration shown after scan |
| J4 | Patient profile, doctor view | Full record, similar cases, add prescription |
| J5 | Add prescription or note | Photo of prescription or typed; patient sees "Added by Dr. X" |
| J6 | My doctor profile | Name, BMDC number, specialty, chamber address |

### K. Premium (4)

| ID | Screen | What is on it |
| --- | --- | --- |
| H57 | Plans | Free vs Premium: family profiles, AI chat, similar searches, storage |
| H58 | Checkout | Payment method and confirmation |
| H59 | Subscription | Current plan, renewal date, receipts, cancel |
| H60 | Limit reached | Sheet shown when a free limit is hit; upgrade or wait |

### L. Notifications (2)

| ID | Screen | What is on it |
| --- | --- | --- |
| H61 | Notifications inbox | Reminders, processing done, access alerts, hospital updates |
| H62 | Notification settings | Per type on/off; access and emergency-access alerts cannot be turned off |

## MedGuard Ward app (nurses, doctors, senior nurses)

The hospital app has 62 screens in 13 areas. It is one responsive app with phone, tablet and PC layouts, and it works offline on the hospital network. What each person sees depends on their role (see Roles and permissions).

**Phone navigation (5 tabs):** Home · Patients · Command (centre, microphone) · Alerts · Me.

**Tablet and PC:** the same five items in a left sidebar, plus Beds and Camera for nurses, and Overview, Queue and Shifts for the ward manager on phone.

A persistent top bar shows ward name, shift time left, sync status and the logged-in person's name and photo, so a shared device never hides who is acting.

### A. Sign-in and session (9)

| ID | Screen | What is on it |
| --- | --- | --- |
| W1 | Splash | Connects to the hospital server; offline state if unreachable |
| W2 | Language | Bangla / English on first launch |
| W3 | Connect device | Scan the hospital's setup QR or enter hospital code; registers the device as personal or shared |
| W4 | Login | Phone number (invited staff only) |
| W5 | OTP | Code, resend timer |
| W6 | Set PIN | 6-digit PIN for quick unlock |
| W7 | Quick unlock / switch user | Shared devices: recent staff faces, tap and enter PIN. Personal phones: biometric |
| W8 | Choose ward | Only for staff assigned to more than one ward |
| W9 | Forgot PIN | OTP reset |

### B. Home (3, by role)

| ID | Screen | What is on it |
| --- | --- | --- |
| W10 | Nurse home | Dose checklist grouped Overdue / Now / Next with patient photo and bed; my beds; handover to acknowledge; shift time left |
| W11 | Doctor home | Needs your approval (AI-read medicines and documents); new results; my patients; alerts on my patients |
| W12 | Senior nurse home | Nurse home plus approvals and a ward strip (free beds, open alerts, overdue doses) |

### C. Patients (11)

| ID | Screen | What is on it |
| --- | --- | --- |
| W13 | Patient list | Sorted by bed; filters: mine, overdue, high fall risk, new results, awaiting approval; each row: photo, name, bed, ID, next dose, status chips |
| W14 | Profile: Summary | Identity header, allergy strip, diagnosis, bed priority, fall-risk level, next dose, last visit seen by camera, attending doctor |
| W15 | Profile: Medications | Active schedule; day-by-day record (given / late / missed / held); items awaiting approval marked |
| W16 | Profile: Vitals | Trend charts with abnormal flags; Add vitals |
| W17 | Profile: Reports | Prescriptions, tests, imaging from this stay |
| W18 | Profile: Timeline | Everything in this stay, newest first |
| W19 | Profile: Notes | Doctor progress notes, nursing notes, transcribed voice notes |
| W20 | Profile: Similar cases | Doctors and nurses; same disclaimer and collapsed outcomes as the public app |
| W21 | Profile: Health record | The patient's own Health Profile history (read-only, every item source-labelled) |
| W22 | Document viewer | Original image beside extracted data, who confirmed it, when |
| W23 | Bed camera | Live feed for this bed (nurses and manager), faces blurred, recent events |

### D. Admission and documents (9)

| ID | Screen | What is on it |
| --- | --- | --- |
| W24 | Admit 1: Bed | Free beds, or pick the next patient from the queue for this bed |
| W25 | Admit 2: Identify | Scan Health Profile QR, emergency access, or new patient with no profile (hospital creates one; handed to the patient's phone later) |
| W26 | Emergency access | Reason required; logged; patient and caregivers notified in their app |
| W27 | Admit 3: Documents | Multi-page capture of prescriptions and reports |
| W28 | Admit 4: Review | AI-extracted fields beside originals; low-confidence fields highlighted |
| W29 | Admit 5: Medicine draft | Proposed dose schedule; doctor or senior nurse approves now, or it goes to their approval queue |
| W30 | Admit 6: Consent | Patient or guardian consent for camera monitoring and data use; on-screen signature or thumbprint photo |
| W31 | Admit done | Summary; bed now Occupied; camera mapping linked |
| W32 | Add report | Capture, AI read, review, attach to profile |

### E. Medicines (6)

| ID | Screen | What is on it |
| --- | --- | --- |
| W33 | Approval queue | Pending AI-read and nurse-entered medicines, oldest first |
| W34 | Approve medicines | Prescription image beside each extracted line; approve, edit or reject per line; allergy-conflict warning |
| W35 | Medicine order | Typed orders: drug from formulary, dose, unit, route, frequency, times, duration, as-needed, instructions |
| W36 | Stop or hold | Reason required; nurse notified |
| W37 | Give dose | Identity header, allergy strip, drug, dose, route, due time; Given / Given late / Not given (refused, nil by mouth, out of stock, vomiting, held by doctor); "visit seen by camera" indicator |
| W38 | Overdue dose | How late, assigned nurse, Give now, or reason |

### F. Vitals (2)

| ID | Screen | What is on it |
| --- | --- | --- |
| W39 | Record vitals | BP, pulse, temperature, SpO2, respiratory rate, blood sugar (hospital configures the list); out-of-range values flagged; Notify doctor |
| W40 | Voice vitals confirm | "Bed 7: BP 120/80, pulse 88" shown as a card: Confirm / Edit |

### G. Alerts (4)

| ID | Screen | What is on it |
| --- | --- | --- |
| W41 | Alerts inbox | Tiers, filters, acknowledged and open |
| W42 | Fall alarm | Full screen, sound and vibration; bed, patient, time, blurred snapshot, live view; I'm going / Resolved / False alarm; countdown to escalation |
| W43 | Fall outcome | No injury / Injury (notify doctor) / False alarm; notes; goes to incident log |
| W44 | Alert detail | Overdue dose or urgent result, with the action to take |

### H. Command assistant (2)

| ID | Screen | What is on it |
| --- | --- | --- |
| W45 | Command | Type or hold to talk, Bangla or English; example commands |
| W46 | Confirm card | "I understood: Bed 7, insulin 10 units, given 8:05"; Confirm / Edit / Cancel. Nothing is saved without Confirm |

### I. Discharge and transfer (4)

| ID | Screen | What is on it |
| --- | --- | --- |
| W47 | Discharge 1: Summary | AI draft from the record; doctor edits and signs |
| W48 | Discharge 2: Take-home medicines | Sent to the patient's Health Profile with reminders |
| W49 | Discharge 3: Confirm | Bed becomes Cleaning; manager told the next patient in queue |
| W50 | Bed transfer | New bed or ward, reason; camera mapping updates |

### J. Shifts (4)

| ID | Screen | What is on it |
| --- | --- | --- |
| W51 | Start shift | Confirm ward and assigned beds |
| W52 | Handover | Auto summary of pending doses, new admissions, open alerts; outgoing nurse reviews, incoming nurse acknowledges |
| W53 | My shifts | Calendar of upcoming shifts |
| W54 | Swap request | Pick a shift and colleague; manager approves |

### K. Ward manager on phone (4)

| ID | Screen | What is on it |
| --- | --- | --- |
| W55 | Ward overview | Free beds, open alerts, staff on duty |
| W56 | Bed board | Bed statuses; mark ready |
| W57 | Queue | Ranked waiting list; add patient; review urgency requests |
| W58 | Approve shift plan | Review and publish the proposed plan |

### L. Sync (2)

| ID | Screen | What is on it |
| --- | --- | --- |
| W59 | Sync status | Actions waiting, last synced time |
| W60 | Resolve conflict | Two versions side by side (for example, a dose marked by two nurses); choose which stands, with reason |

### M. Me (2)

| ID | Screen | What is on it |
| --- | --- | --- |
| W61 | My profile | Photo, name, role, wards, phone |
| W62 | Settings | See the shared settings section |

## Ward Dashboard (ward manager, desktop)

The dashboard has 21 screens for the ward manager at a desktop PC; the most-used parts are mirrored on phone in the Ward app (W55–W58). The admission desk uses only the queue screens.

**Navigation:** left sidebar: Overview · Camera · Beds · Queue · Staff · Shifts · Incidents · Reports · Patients · Approvals. Alerts open as a panel on the right from any page.

| ID | Screen | What is on it |
| --- | --- | --- |
| D1 | Login | Phone + OTP, then PIN; session times out on shared PCs |
| D2 | Choose ward | For managers covering more than one ward |
| D3 | Overview | Bed map by status, live alert feed, staff on duty, today's numbers: free beds, open alerts, doses on time |
| D4 | Camera wall | Grid of feeds with AI boxes and bed IDs, faces blurred; event markers |
| D5 | Single camera | One feed large, with its event list (falls, nurse visits) and event snapshots |
| D6 | Bed board | Every bed: Occupied, Ready, Cleaning, Reserved, Out of service; time in status |
| D7 | Bed detail | Current patient, history, cleaning log, mapped camera |
| D8 | Waiting queue | Ranked list with priority level, hours waiting, booking time, patient urgency requests flagged; why each patient is ranked there; override with reason |
| D9 | Add to queue | Scan Health Profile QR or enter details; priority level; source (emergency, OPD, referral); bed type needed |
| D10 | Urgency requests | Requests from the patient app with the patient's reason; raise priority or decline with reason (patient sees the answer) |
| D11 | Assign bed | Freed bed matched to the top patient; confirm; patient and admission desk notified |
| D12 | Staff on duty | Who is in, assigned beds, open tasks, overdue doses per nurse |
| D13 | Assign beds to nurses | Drag patients onto nurses for the current shift |
| D14 | Shift planner | Week grid; AI-proposed plan; warnings when the hospital's ratio or rest rules break; drag to change; publish |
| D15 | Swap requests | Approve or decline nurse shift swaps |
| D16 | Incident log | Falls and missed doses with response time and outcome |
| D17 | Incident detail | Timeline of the alarm (sent, escalated, acknowledged, resolved), outcome, notes |
| D18 | Dose compliance | On-time, late and missed doses by nurse, drug and time of day |
| D19 | Reports | Pilot metrics: bed turnover, doses on time, fall response time; before vs after; export PDF/CSV |
| D20 | Patient directory | Search all ward patients; opens the read-only profile |
| D21 | Approvals | Medicine approvals, for a manager who is also the senior nurse |

## Admin Console

The Admin Console has 25 screens split between two audiences, as you decided: the hospital manages its own staff, beds and rules (13 screens); the MedGuard team handles hospital setup, cameras and infrastructure (12 screens). Both require two-step login.

### Hospital admin (self-serve, 13)

| ID | Screen | What is on it |
| --- | --- | --- |
| A1 | Login | Phone or email, OTP, second factor |
| A2 | Hospital overview | Wards, beds, active staff, cameras online, plan and renewal |
| A3 | Staff | Search by name, role, ward, status |
| A4 | Invite or edit staff | Name, phone, role, doctor tier, senior-nurse flag, wards |
| A5 | Deactivate staff | Removes access immediately; keeps their audit history |
| A6 | Beds | Beds per ward; add bed, bed type, mark out of service |
| A7 | Shift rules | Shift pattern and times, nurse-to-patient ratio per ward, minimum rest between shifts |
| A8 | Vitals setup | Which vitals each ward records and their normal ranges |
| A9 | Formulary additions | Hospital's own drugs added to MedGuard's base list |
| A10 | Emergency access review | Every emergency access: who, patient, reason, time; mark reviewed or escalate |
| A11 | Audit log | Filter by person, patient, action, date; export |
| A12 | Subscription | Plan, beds and wards covered, invoices |
| A13 | Hospital settings | Name, logo, address, consent form text, data retention shown |

### MedGuard team (internal, 12)

| ID | Screen | What is on it |
| --- | --- | --- |
| M1 | Login | Internal login with second factor |
| M2 | Hospitals | All hospitals: status, plan, system health |
| M3 | Onboard hospital | Details, plan, first hospital-admin account |
| M4 | Wards and rooms | Ward and room structure per hospital |
| M5 | Cameras | Each camera: room, online/offline, last event |
| M6 | Bed-zone mapping | Draw a box over each bed on the camera frame, link it to a bed number, run a test detection |
| M7 | Server and devices | Local server load, AI model versions, storage, last sync, registered devices |
| M8 | Plans and billing | Plans, prices, invoices per hospital |
| M9 | Base formulary | Bangladeshi brand names mapped to generic names |
| M10 | BMDC check log | Auto-check results and failures, for support questions |
| M11 | Support lookup | Account status only (locked, verified, plan); no health data without the user's consent |
| M12 | Team audit log | Every MedGuard staff action |

## Shared settings, notifications and screen states

Account and settings take 17 screens in the Health Profile app; the Ward app reuses 10 of them, because staff names, phones and roles are managed by the hospital admin. Every screen in every app must also be designed in the 12 states listed below.

### Settings and account (17)

| ID | Screen | Health Profile | Ward app | What is on it |
| --- | --- | --- | --- | --- |
| S1 | Settings home | ✓ | ✓ | Grouped list of everything below |
| S2 | Edit personal info | ✓ | Photo only | Name, photo, date of birth, sex |
| S3 | Change phone | ✓ | — | OTP to old number, then new number |
| S4 | Change email | ✓ | — | New email, verification |
| S5 | Change password | ✓ | — | Current, new, confirm |
| S6 | Sign-in methods | ✓ | — | Phone, email, Google; add or remove; at least one must stay |
| S7 | Security | ✓ | ✓ | Biometric, auto-lock time, change PIN, logged-in devices with Log out |
| S8 | Language | ✓ | ✓ | Bangla / English |
| S9 | Text size | ✓ | ✓ | Preview at each size |
| S10 | Notification settings | ✓ | ✓ | Per type; critical alerts cannot be turned off |
| S11 | Privacy and consents | ✓ | — | Consents given, with dates; withdraw AI processing |
| S12 | Download my data | ✓ | — | All records and documents as a file, emailed or saved |
| S13 | Delete account | ✓ | — | What is deleted, what happens to family profiles and caregivers; OTP confirm |
| S14 | Help and FAQ | ✓ | ✓ | Searchable answers, short videos |
| S15 | Contact support | ✓ | ✓ | Describe the problem, attach a screenshot |
| S16 | About and legal | ✓ | ✓ | Terms, privacy policy, licences, app version |
| S17 | Log out | ✓ | ✓ | Confirm; warns if offline actions have not synced |

### States every screen needs

| State | What the user sees |
| --- | --- |
| Loading | Skeleton of the layout, never a blank screen |
| Empty | Why it is empty and the one action to fill it ("No reports yet. Upload your first") |
| Error | What went wrong in plain words, Retry, and what was saved |
| Offline | Banner; actions that need internet are greyed with the reason |
| Hospital server unreachable | Ward app keeps working from local data; banner says so |
| Permission denied | Camera, microphone or notifications blocked: why it is needed, Open settings |
| No access | Role cannot see this; who to ask |
| Session locked or expired | PIN or biometric unlock, without losing unsaved input |
| Sync conflict | Opens W60 |
| Free limit reached | Opens H60 |
| Forced update | Old app version blocked until updated (needed when a safety fix ships) |
| Maintenance | Planned downtime notice with expected end time |

### Notifications

| App | Event | Sent to | Tier |
| --- | --- | --- | --- |
| Ward | Fall detected | Assigned nurse; after 60 s all nurses, ward manager, duty doctor | Critical |
| Ward | Dose overdue | Assigned nurse, then senior nurse | High |
| Ward | Critical result or out-of-range vital | Attending doctor, assigned nurse | High |
| Ward | Medicines awaiting approval | Doctors and senior nurse on the ward | Normal |
| Ward | Bed freed, next patient ready | Ward manager, admission desk | Normal |
| Ward | Patient urgency request | Ward manager | Normal |
| Ward | Handover to acknowledge | Incoming nurse | Normal |
| Ward | Shift plan published, swap request | Nurses, ward manager | Normal |
| Ward | Sync conflict | The staff member involved | Normal |
| Health Profile | Medicine reminder | Profile owner | High |
| Health Profile | Dose missed | Caregivers (if turned on) | Normal |
| Health Profile | Documents processed, issues to resolve | Uploader | Normal |
| Health Profile | Profile opened by QR, emergency access | Owner and caregivers | High, cannot be turned off |
| Health Profile | Hospital record added, discharge summary | Owner and caregivers | Normal |
| Health Profile | Queue status, urgency request answered | Owner and caregivers | Normal |
| Health Profile | Caregiver invitation | Invited person | Normal |
| Health Profile | Subscription renewal or failure | Account holder | Normal |

## Key flows

Six flows carry most of the clinical risk. Each step names who acts and on which screen, so designers and developers can trace every hand-off.

### 1. Person builds their Health Profile

1. **Person:** taps Upload, chooses which family profile, photographs all documents in one go (H19, H20).
2. **AI:** reads every page; user can leave the app (H21).
3. **Person:** resolves flagged problems: duplicates, another person's name, unreadable pages, conflicting medicines (H22).
4. **Person:** reviews extracted fields beside the originals and confirms (H23).
5. **App:** builds the profile with only the sections that have data; prompts to add important missing items, which can be skipped (H26).

### 2. Similar case search

1. **Person or doctor:** opens Similar cases; accepts the disclaimer the first time (H41).
2. **Person:** chooses which profile details to search with (H42).
3. **App:** if the profile shows danger signs, the "See a doctor now" warning appears above the results (H43).
4. **Person:** browses results with outcomes collapsed; opens a case; can share it with a doctor (H44, H45).

### 3. Waiting list to admission

1. **Admission desk or ward staff:** scans the patient's QR (or enters details) and adds them to the ward queue with a priority level (D9).
2. **Patient:** sees queue status in their app and can send an urgency request with a reason (H18).
3. **Ward manager:** reviews the request, raises priority or declines with a reason (D10).
4. **Doctor at discharge:** frees a bed; it turns Cleaning, then Ready (W49, D6).
5. **Ward manager:** confirms the top patient for the freed bed; patient and admission desk are notified (D11).

### 4. Admission and first dose

1. **Nurse:** picks the bed, scans the patient's QR, or uses emergency access with a reason, or creates a new profile (W24–W26).
2. **Nurse:** photographs prescriptions and reports; reviews the AI reading (W27, W28).
3. **Nurse:** records consent for camera monitoring and data use (W30).
4. **Doctor or senior nurse:** approves each medicine line against the prescription image (W29 or W33, W34).
5. **App:** approved medicines appear on the assigned nurse's dose checklist (W10).
6. **Nurse:** at the due time, opens Give dose, checks identity and allergy strip, taps Given; the camera's visit appears beside it (W37).

### 5. Fall alarm

1. **Camera AI:** detects a fall at a bed.
2. **Assigned nurse:** gets the full-screen alarm with sound (W42).
3. **If not acknowledged in 60 seconds:** all nurses on duty, the ward manager and the duty doctor get it at once.
4. **First responder:** taps I'm going; others see who is going.
5. **Responder:** records the outcome: no injury, injury (doctor notified) or false alarm (W43).
6. **Ward manager:** reviews the incident timeline and response time (D16, D17).

### 6. Discharge

1. **Doctor:** reviews and signs the AI-drafted discharge summary (W47).
2. **Doctor:** confirms take-home medicines; they go to the patient's Health Profile with reminders (W48).
3. **App:** stay records are added to the patient's profile automatically; the hospital's access ends (rule to confirm in open items).
4. **Bed:** turns Cleaning; the ward manager is told the next patient in the queue (W49).

## Roles and permissions

You gave no preference on staff tiers, so this is a proposed default for review: interns cannot approve or stop medicines, and only doctors discharge. Confirming this default is the second open item.

### Hospital roles

| Action | Staff nurse | Senior nurse | Doctor (consultant, MO) | Intern | Ward manager | Admission desk | Hospital admin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| View ward patient profiles | ✓ | ✓ | ✓ | ✓ | ✓ | Name and bed only | — |
| Admit patient, capture documents | ✓ | ✓ | ✓ | ✓ | — | — | — |
| Emergency access to a profile | — | ✓ | ✓ | — | — | — | — |
| Approve AI-read medicines | — | ✓ | ✓ | — | If senior nurse | — | — |
| Type medicine orders | — | — | ✓ | Draft, needs approval | — | — | — |
| Stop or hold a medicine | — | — | ✓ | — | — | — | — |
| Give dose, record vitals | ✓ | ✓ | ✓ | ✓ | — | — | — |
| Live camera view | ✓ | ✓ | — | — | ✓ | — | — |
| Similar cases | ✓ | ✓ | ✓ | ✓ | — | — | — |
| Discharge | — | — | ✓ | — | — | — | — |
| Bed transfer | — | ✓ | ✓ | — | ✓ | — | — |
| Add patient to queue | — | — | ✓ | — | ✓ | ✓ | — |
| Set priority, override queue | — | — | ✓ | — | ✓ | — | — |
| Plan and publish shifts | — | — | — | — | ✓ | — | — |
| Manage staff, beds, rules | — | — | — | — | — | — | ✓ |
| Audit log, emergency access review | — | — | — | — | — | — | ✓ |

### Health Profile roles

| Action | Owner | Caregiver (Manage) | Caregiver (View) | Outside doctor (shared) | Hospital (during stay) |
| --- | --- | --- | --- | --- | --- |
| View full record | ✓ | ✓ | ✓ | ✓ while shared | ✓ until discharge |
| Upload and edit | ✓ | ✓ | — | Add prescriptions and notes | Adds stay records |
| Delete records | ✓ | ✓ | — | — | — |
| Share, revoke access | ✓ | ✓ | — | — | — |
| Manage caregivers | ✓ | — | — | — | — |
| Request urgent review | ✓ | ✓ | — | — | — |
| Delete account | ✓ | — | — | — | — |

## Screen count

MedGuard needs 202 screens across four front-ends, of which 192 are unique designs (the Ward app reuses 10 settings screens from the Health Profile app). Each screen also needs the 12 states from the shared section.

| Front-end | Main screens | Settings screens | Total | Platform |
| --- | --- | --- | --- | --- |
| Health Profile app | 68 | 17 | 85 | Phone (PWA) |
| MedGuard Ward app | 61 | 10 (reused) | 71 | Phone, tablet, PC |
| Ward Dashboard | 21 | — | 21 | Desktop web |
| Admin Console | 25 (13 hospital + 12 MedGuard) | — | 25 | Desktop web |
| **Total** | **175** | **27** | **202** |  |

## Open items for the next round

Twelve decisions are still open; tick each one as we settle it. The first four affect patient safety directly.

- [ ] **Numbers in Bangla mode:** show doses and vitals in Bangla digits (১০ মিগ্রা) or always in English digits (10 mg) to avoid misreading?
- [ ] **Roles:** confirm the proposed default (interns cannot approve or stop medicines; only doctors and senior nurses use emergency access; doctors do not see the live camera).
- [ ] **Emergency access:** is one staff member's reason enough, or must a second staff member confirm?
- [ ] **Drug safety checks:** besides allergy conflicts, should the app check drug interactions and duplicate drugs? This needs a drug database.
- [ ] **New patient with no phone:** how do they get their Health Profile later (printed QR card at discharge, SMS link to a relative)?
- [ ] **Bed labels:** print a QR label or wristband per patient so nurses scan before giving a dose?
- [ ] **QR access length:** how long a scanned QR gives access (hospital: until discharge? outside doctor: 24 hours? user picks?).
- [ ] **Queue ranking:** how much weight a patient's urgency request carries next to emergency level, hours waiting and booking time.
- [ ] **Free plan limits:** family profiles, AI chats per month, similar searches per month, document storage.
- [ ] **Payment methods:** bKash, Nagad, card, or others.
- [ ] **Account deletion:** immediate, or a grace period (for example 30 days)? Do hospitals keep their own copy of a stay's records after a user deletes theirs?
- [ ] **BMDC auto-check:** needs a confirmed way to look up BMDC registrations; if none exists, doctor features cannot unlock under the current rule.
