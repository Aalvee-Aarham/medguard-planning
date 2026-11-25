# MedGuard AI

An AI ward assistant for Bangladeshi hospitals: one health profile per patient, a dose checklist and fall alarms for nurses, and a live view for ward managers.

## The 4 apps

| App | Plan | Built by |
|---|---|---|
| Health Profile (patients, families, doctors) | [medguard-health-profile/PLAN.md](medguard-health-profile/PLAN.md) | Arko |
| Ward app (nurses, doctors) | [medguard-ward/PLAN.md](medguard-ward/PLAN.md) | Anamika, Arna |
| Ward Dashboard (ward manager) | [medguard-ward-dashboard/PLAN.md](medguard-ward-dashboard/PLAN.md) | Anamika, Arna |
| Admin Console (hospital admin, MedGuard team) | [medguard-admin-console/PLAN.md](medguard-admin-console/PLAN.md) | Aalvee |

**Miro board (full plan, all screens):** https://miro.com/app/board/uXjVEJmlPzs=/

Other docs: [plan.md](plan.md) (full UI/UX plan) · [UI theme prompt (1).md](<UI theme prompt (1).md>) (design system) · [MedGuardAI_Proposal.pdf](MedGuardAI_Proposal.pdf)

## Stack

- **React + Vite + TypeScript**
- **Tailwind CSS v4**: theme tokens go in `@theme` (they're in every PLAN.md)
- **GSAP**: animation and parallax
- **vite-plugin-pwa**: install and offline support
- Frontend only for now, running on mock data

Each app gets its own folder and its own Vite project.

```bash
npm create vite@latest . -- --template react-ts
npm i react-router-dom lucide-react gsap
npm i -D tailwindcss @tailwindcss/vite vite-plugin-pwa
npm run dev
```

## Animation (GSAP + parallax)

- Use GSAP (`gsap`, `@gsap/react` `useGSAP`, `ScrollTrigger`) for page transitions, onboarding slides, card and list entrances, and stat counters.
- Parallax goes on onboarding and welcome screens, empty-state illustrations and dashboard headers. Build it with `ScrollTrigger` layers moving at different speeds.
- Keep animations fast: 150–250 ms for UI and `ease: "power2.out"`.
- **Safety:** never animate or delay the parts that must act instantly: Give dose, the fall alarm, the allergy strip, confirm dialogs.
- **Reduce motion:** wrap every animation in `gsap.matchMedia()` and turn it off for `(prefers-reduced-motion: reduce)`.

## PWA: mobile and web

The Health Profile app and the Ward app are installable PWAs. The Dashboard and Admin Console are normal desktop web apps; they can be installed too, but don't have to be.

| | How it works |
|---|---|
| **Android (Chrome)** | An "Install app" prompt appears, or use menu → Add to Home screen. Opens full-screen with its own icon. Push notifications work |
| **iPhone (Safari)** | Share → Add to Home Screen. Push notifications work only after installing (iOS 16.4+) |
| **Desktop (Chrome / Edge)** | An install icon appears in the address bar. Opens in its own window |
| **Any browser** | Also works as a normal website with nothing installed |

**Setup:** add `VitePWA({ registerType: 'autoUpdate', manifest: {...} })` to `vite.config.ts`. The manifest needs a name, icons (192 and 512 px), `theme_color: #1D5FBF`, `background_color: #F5F8FC` and `display: standalone`.

**Offline:**
- The service worker caches the app shell (HTML, JS, CSS, fonts).
- The data a user has already seen is saved in `localStorage`, so those screens still open offline.
- Actions taken offline are queued and sent when the connection returns. An offline banner always shows.
- Uploads and AI features need internet. Their buttons are greyed out with the reason.

**Updates:** a new version installs in the background. When a safety fix ships, a forced-update screen blocks the old version.

## Rules

Read your app's `PLAN.md` first. The theme and the 15 safety rules are the same for all 4 apps.
