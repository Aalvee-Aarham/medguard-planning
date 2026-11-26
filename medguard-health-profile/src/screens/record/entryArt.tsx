import { useRef, type CSSProperties, type ReactNode } from 'react'
import { Check, User, type LucideIcon } from 'lucide-react'
import { useT } from '../../i18n'
import { cx } from '../../components/ui'
import { useTilt } from '../../lib/tilt'

/**
 * Pieces for H24 Type it in: colour-coded 3D type tiles, a live 3D record card for the preview
 * (spinning coin emblem, "Entered by you" seal, typing caret) and a blood-pressure dial for vitals.
 * All of it is decoration around the real form; the card is a live region so changes are announced.
 */

export const TYPE_HUE: Record<string, [string, string]> = {
  conditions: ['#e31b54', '#a11043'],
  allergy: ['#f79009', '#b54708'],
  medicines: ['#1D5FBF', '#174c99'],
  vitals: ['#0e9384', '#067647'],
  surgeries: ['#7a5af8', '#5925dc'],
  vaccination: ['#2e90fa', '#175cd3'],
}
export const hueVars = (type: string) => {
  const [c1, c2] = TYPE_HUE[type] ?? TYPE_HUE.medicines
  return { '--c1': c1, '--c2': c2 } as CSSProperties
}

export function TypeTile({ type, icon: Icon, label, hint, on, onPick }: { type: string; icon: LucideIcon; label: string; hint: string; on: boolean; onPick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  useTilt(ref, 10)
  return (
    <button ref={ref} type="button" role="radio" aria-checked={on} onClick={onPick} style={hueVars(type)} className={cx('type-tile tilt group relative flex min-h-28 flex-col items-start gap-2 overflow-hidden rounded-[22px] p-3 text-left md:p-4', on && 'is-on')}>
      <span aria-hidden className="type-tile-glow" />
      <span className="type-ico pop grid size-12 place-items-center rounded-2xl">
        <Icon className="size-6" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="pop-sm">
        <span className="block text-small font-semibold text-ink-900 md:text-body">{label}</span>
        <span className="hidden text-caption text-ink-700 sm:block">{hint}</span>
      </span>
      <span aria-hidden className="type-check absolute top-3 right-3 grid size-7 place-items-center rounded-full text-white">
        <Check className="size-4" strokeWidth={3} />
      </span>
    </button>
  )
}

/** Live preview: a record card that tilts, with a coin emblem that flips when the type changes */
export function EntryCard({ type, icon: Icon, kind, title, placeholder, detail, sub, date, children }: { type: string; icon: LucideIcon; kind: string; title: string; placeholder: string; detail?: string; sub?: ReactNode; date: string; children?: ReactNode }) {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  useTilt(ref, 9)
  const seal = `${t('Entered by you')} · MedGuard · `.toUpperCase()
  return (
    <div className="[perspective:1100px]">
      <div ref={ref} style={hueVars(type)} className="entry-card tilt group relative overflow-hidden rounded-[26px]" aria-live="polite">
        <div className="entry-band relative h-28 overflow-hidden px-5 pt-4 text-white">
          <div aria-hidden className="passport-guilloche absolute inset-0" />
          <div aria-hidden className="passport-holo absolute inset-0 opacity-50 group-hover:opacity-100" />
          <p className="relative font-mono text-caption font-bold tracking-[0.22em] uppercase opacity-90">MedGuard · {kind}</p>
        </div>
        <div className="coin-wrap pop absolute top-12 right-5" aria-hidden>
          <div key={type} className="coin">
            <span className="coin-face">
              <Icon className="size-8" strokeWidth={1.75} />
            </span>
            <span className="coin-face back">
              <Icon className="size-8" strokeWidth={1.75} />
            </span>
          </div>
        </div>
        <div className="relative px-5 pt-4 pb-5">
          <p className={cx('pop-sm min-h-8 pr-24 text-h2 leading-tight font-bold break-words', title ? 'text-ink-900' : 'text-ink-500 italic')}>
            {title || placeholder}
            <span aria-hidden className="entry-caret" />
          </p>
          {sub && <div className="mt-1 text-small text-ink-700">{sub}</div>}
          {children}
          {detail ? (
            <p className="mt-2 text-small break-words text-ink-700">{detail}</p>
          ) : (
            <div aria-hidden className="mt-3 flex flex-col gap-1.5">
              <span className="paper-line w-[85%]" />
              <span className="paper-line w-[60%]" />
            </div>
          )}
          <div className="mt-5 flex items-end justify-between gap-3">
            <p className="flex items-center gap-1.5 text-caption text-ink-700">
              <User className="size-3.5" aria-hidden />
              {t('Entered by you')}, <span className="tabular">{date}</span>
            </p>
            <svg viewBox="0 0 100 100" className="entry-seal size-20 shrink-0" aria-hidden>
              <defs>
                <path id="seal-path" d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" />
              </defs>
              <circle cx="50" cy="50" r="46" fill="none" stroke="var(--c1)" strokeWidth="2" strokeDasharray="2 4" />
              <g className="seal-spin">
                <text fontSize="9.5" fontWeight="700" letterSpacing="1.2" fill="var(--c1)">
                  <textPath href="#seal-path">{seal}</textPath>
                </text>
              </g>
              <circle cx="50" cy="50" r="20" fill="var(--c1)" opacity="0.12" />
              <path d="M40 50l7 7 14-15" fill="none" stroke="var(--c1)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Two-ring pressure dial: outer ring systolic (0-220), inner ring diastolic (0-140). Numbers only, no verdict. */
export function BpDial({ sys, dia }: { sys: number; dia: number }) {
  const t = useT()
  const R1 = 52
  const R2 = 38
  const arc = (r: number) => Math.PI * r // half circle length
  const fs = Math.min(Math.max(sys / 220, 0), 1)
  const fd = Math.min(Math.max(dia / 140, 0), 1)
  return (
    <div className="mt-3 flex items-center gap-4">
      <svg viewBox="0 0 120 70" className="bp-dial w-40 shrink-0" aria-hidden>
        <path d={`M ${60 - R1} 62 A ${R1} ${R1} 0 0 1 ${60 + R1} 62`} fill="none" stroke="var(--color-primary-100)" strokeWidth="9" strokeLinecap="round" />
        <path d={`M ${60 - R1} 62 A ${R1} ${R1} 0 0 1 ${60 + R1} 62`} fill="none" stroke="var(--c1)" strokeWidth="9" strokeLinecap="round" strokeDasharray={arc(R1)} strokeDashoffset={arc(R1) * (1 - fs)} className="bp-arc" />
        <path d={`M ${60 - R2} 62 A ${R2} ${R2} 0 0 1 ${60 + R2} 62`} fill="none" stroke="var(--color-primary-100)" strokeWidth="7" strokeLinecap="round" />
        <path d={`M ${60 - R2} 62 A ${R2} ${R2} 0 0 1 ${60 + R2} 62`} fill="none" stroke="var(--c2)" strokeWidth="7" strokeLinecap="round" strokeDasharray={arc(R2)} strokeDashoffset={arc(R2) * (1 - fd)} className="bp-arc" opacity="0.75" />
        <g className="bp-needle" style={{ transform: `rotate(${-90 + fs * 180}deg)` }}>
          <line x1="60" y1="62" x2="60" y2="16" stroke="var(--color-ink-900)" strokeWidth="2.5" strokeLinecap="round" />
        </g>
        <circle cx="60" cy="62" r="5" fill="var(--color-ink-900)" />
      </svg>
      <dl className="grid grid-cols-[auto_auto] gap-x-3 text-small">
        <dt className="text-ink-700">{t('Systolic')}</dt>
        <dd className="font-bold text-ink-900 tabular">{sys || '—'}</dd>
        <dt className="text-ink-700">{t('Diastolic')}</dt>
        <dd className="font-bold text-ink-900 tabular">{dia || '—'}</dd>
      </dl>
    </div>
  )
}
