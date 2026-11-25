# MedGuard Admin Console

Install the project and start Vite from this directory.

```bash
npm ci
npm run dev
```

| Area | Sign-in route | Demo account |
| --- | --- | --- |
| Hospital administration | `/login` | `farhana@shanti.example` |
| MedGuard operations | `/medguard/login` | `tania@medguard.example` |

Select **Use demo account**, then enter verification code `123456` and authenticator code `000000`. Use the language control to switch between English and Bangla.

This frontend uses fictional browser-local records and simulated sign-in, SMS, and camera detection. Demo controls can switch users, preview system states, and reset local changes.

Run `npm run build` to type-check and create a production bundle. A static host needs to serve `index.html` for app routes.
