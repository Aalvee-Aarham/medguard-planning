// Full-page layout for D1 Login and D2 Choose ward: animated sky-blue scene with a centred card.
// The floating stickers, waves and heartbeat line are decorative (aria-hidden) and stop under "reduce motion".
import {
  BedDouble, ClipboardPlus, Dna, Droplet, HeartPulse, Pill, ShieldPlus, Stethoscope, Syringe, UserRoundCheck,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useT } from '../../state/store';

const STICKERS: { Icon: LucideIcon; left: number; size: number; solid?: boolean }[] = [
  { Icon: Stethoscope, left: 4, size: 50 },
  { Icon: HeartPulse, left: 14, size: 40, solid: true },
  { Icon: Pill, left: 24, size: 46 },
  { Icon: BedDouble, left: 72, size: 54 },
  { Icon: ClipboardPlus, left: 82, size: 42, solid: true },
  { Icon: Droplet, left: 92, size: 48 },
  { Icon: Syringe, left: 8, size: 38 },
  { Icon: UserRoundCheck, left: 88, size: 44, solid: true },
  { Icon: Dna, left: 20, size: 52 },
  { Icon: ShieldPlus, left: 78, size: 40 },
];

export function AuthLayout({ children, aside, wide }: { children: ReactNode; aside?: ReactNode; wide?: boolean }) {
  const t = useT();
  return (
    <div className="auth-scene relative flex min-h-screen flex-col overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="auth-orb left-[-80px] top-[-80px] h-80 w-80" />
        <div className="auth-orb right-[-60px] top-1/3 h-64 w-64 [animation-duration:18s]" />

        <svg className="absolute inset-x-0 top-32 h-16 w-full opacity-55" viewBox="0 0 700 60" preserveAspectRatio="none">
          <path
            d="M0 30 H140 l10 -22 l10 44 l10 -22 H350 l10 -22 l10 44 l10 -22 H560 l10 -22 l10 44 l10 -22 H700"
            fill="none" stroke="var(--color-sky-400)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="120 900"
            style={{ animation: 'auth-ecg 3.5s linear infinite' }}
          />
        </svg>

        {STICKERS.map(({ Icon, left, size, solid }, i) => (
          <div
            key={i}
            className={`auth-sticker ${solid ? 'is-solid' : ''}`}
            style={{ left: `${left}%`, width: size, height: size, animationDuration: `${11 + (i % 4) * 3}s`, animationDelay: `${-i * 1.7}s` }}
          >
            <Icon size={Math.round(size * 0.48)} strokeWidth={1.75} />
          </div>
        ))}

        <svg className="auth-wave h-28 [animation-duration:16s]" viewBox="0 0 1440 110" preserveAspectRatio="none">
          <path d="M0 60 Q180 20 360 60 T720 60 T1080 60 T1440 60 V110 H0Z" fill="var(--color-sky-300)" opacity=".45" />
        </svg>
        <svg className="auth-wave h-20 [animation-duration:10s]" viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path d="M0 40 Q180 0 360 40 T720 40 T1080 40 T1440 40 V80 H0Z" fill="var(--color-sky-400)" opacity=".5" />
        </svg>
      </div>

      <header className="relative z-10 flex h-16 items-center justify-end px-8">
        {aside && <div className="rounded-control bg-white/80">{aside}</div>}
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 pb-24">
        <div
          className={`auth-card w-full rounded-[22px] border border-white bg-white/95 p-8 shadow-[0_20px_50px_rgba(3,105,161,0.18)] ${wide ? 'max-w-3xl' : 'max-w-md'}`}
        >
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="auth-logo relative flex h-16 w-16 items-center justify-center rounded-full bg-sky-600 text-white">
              <ShieldPlus size={32} strokeWidth={1.75} aria-hidden />
            </div>
            <p className="mt-3 text-lg font-bold text-sky-900">{t('app.name')}</p>
            <p className="text-sm text-ink-500">{t('app.subtitle')}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
