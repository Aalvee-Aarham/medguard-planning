import { forwardRef, useRef, type ComponentProps, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, type LucideIcon } from 'lucide-react'
import { useT } from '../i18n'
import { cx } from './ui'
import { CountUp } from './art'
import { useTilt } from '../lib/tilt'
import { gsap, useGSAP, MOTION_OK } from '../lib/motion'

/**
 * Shared look for the record family of screens: an aurora wash for glass to blur,
 * a glass hero header with a glossy icon, neumorphic stat tiles, a glass segmented control
 * and a tilting glass card. Styles live in index.css (.glass, .neu, .skeuo-icon, .tilt ...).
 */

export function AuroraBackdrop({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cx('hero-aurora pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] overflow-hidden', className)}>
      <span className="blob blob-a -top-32 right-[6%] size-[440px]" />
      <span className="blob blob-b top-24 left-[30%] size-[300px]" />
      <span className="blob blob-c top-10 -left-24 size-[360px]" />
      <div className="hero-grid absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-page" />
    </div>
  )
}

/** Page shell: aurora behind, content column in front. Entrance: [data-rise] blocks rise once on load. */
export function GlassPage({ children, wide = true, deps = [] }: { children: ReactNode; wide?: boolean; deps?: unknown[] }) {
  const root = useRef<HTMLDivElement>(null)
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        gsap.from('[data-rise]', { opacity: 0, y: 22, duration: 0.5, stagger: 0.05, ease: 'power2.out', clearProps: 'all' })
      })
      return () => mm.revert()
    },
    { scope: root, dependencies: deps },
  )
  return (
    <div className="relative isolate">
      <AuroraBackdrop />
      <div ref={root} className={cx('mx-auto w-full px-4 pt-4 pb-10 md:px-6 lg:px-8 lg:pt-8', wide ? 'max-w-[1400px]' : 'max-w-3xl')}>
        {children}
      </div>
    </div>
  )
}

/** Glass hero header. One H1 per screen. `children` is a row of stats under the title. */
export function GlassHero({
  icon: Icon,
  eyebrow,
  title,
  sub,
  back = true,
  actions,
  children,
  tone = 'primary',
}: {
  icon?: LucideIcon
  eyebrow?: string
  title: ReactNode
  sub?: ReactNode
  back?: boolean | string
  actions?: ReactNode
  children?: ReactNode
  tone?: 'primary' | 'danger'
}) {
  const nav = useNavigate()
  const t = useT()
  return (
    <header data-rise className="glass glass-sheen mb-6 rounded-[28px] p-4 md:p-6">
      <div className="flex flex-wrap items-start gap-3 md:gap-4">
        {back && (
          <button
            type="button"
            aria-label={t('Back')}
            onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}
            className="neu neu-press grid size-12 shrink-0 place-items-center rounded-2xl text-ink-900"
          >
            <ArrowLeft className="size-5" strokeWidth={2} />
          </button>
        )}
        {Icon && (
          <span className={cx('skeuo-icon hidden size-14 shrink-0 place-items-center rounded-2xl sm:grid', tone === 'danger' && '!bg-[linear-gradient(160deg,var(--color-danger-border),var(--color-danger-text))]')}>
            <Icon className="size-7" strokeWidth={1.75} aria-hidden />
          </span>
        )}
        <div className="min-w-0 flex-1">
          {eyebrow && <p className="text-caption font-semibold tracking-[0.18em] text-primary-600 uppercase">{eyebrow}</p>}
          <h1 className="text-h1 font-bold tracking-tight text-ink-900 md:text-display">{title}</h1>
          {sub && <div className="mt-1 text-body text-ink-700">{sub}</div>}
        </div>
        {actions && <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto">{actions}</div>}
      </div>
      {children && <div className="mt-5 grid grid-cols-2 gap-3 md:flex md:flex-wrap">{children}</div>}
    </header>
  )
}

/** Pressed-in stat tile with a glossy icon. Numbers count up once. */
export function NeuStat({ icon: Icon, label, value, suffix, text, tone }: { icon: LucideIcon; label: string; value?: number; suffix?: string; text?: ReactNode; tone?: 'danger' | 'success' }) {
  return (
    <div className="neu-inset flex min-w-0 items-center gap-3 rounded-2xl p-3 md:min-w-[180px]">
      <span className={cx('skeuo-icon grid size-10 shrink-0 place-items-center rounded-xl')}>
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="line-clamp-2 text-caption leading-tight text-ink-700">{label}</p>
        <p className={cx('text-h3 leading-tight font-bold break-words tabular md:text-h2', tone === 'danger' ? 'text-danger-text' : tone === 'success' ? 'text-success-text' : 'text-ink-900')}>
          {value !== undefined ? <CountUp value={value} decimals={value % 1 ? 1 : 0} /> : text}
          {suffix && <span className="ml-1 text-small font-semibold">{suffix}</span>}
        </p>
      </div>
    </div>
  )
}

/** Glass segmented control (single choice). Keyboard: Tab to it, arrows not needed (buttons). */
export function Segmented<T extends string>({ value, onChange, options, label, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; icon?: LucideIcon; count?: number }[]; label: string; className?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cx('neu-inset no-scrollbar flex gap-1 overflow-x-auto rounded-2xl p-1', className)}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cx(
              'inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-3 text-small font-semibold whitespace-nowrap transition-all duration-200',
              on ? 'neu text-primary-700' : 'text-ink-700 hover:text-ink-900',
            )}
          >
            {o.icon && <o.icon className="size-4" strokeWidth={2} aria-hidden />}
            {o.label}
            {o.count !== undefined && <span className={cx('rounded-full px-1.5 text-caption tabular', on ? 'bg-primary-600 text-white' : 'bg-white/70')}>{o.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

type TiltProps = { to?: string; className?: string; children: ReactNode; max?: number } & Omit<ComponentProps<'div'>, 'ref'>

/** Glass card that tilts toward the pointer. Renders a Link when `to` is set. */
export const TiltCard = forwardRef<HTMLElement, TiltProps>(function TiltCard({ to, className, children, max = 5, ...rest }, _ref) {
  const ref = useRef<HTMLAnchorElement & HTMLDivElement>(null)
  useTilt(ref, max)
  const cls = cx('tilt glass glass-sheen group block rounded-[22px] p-4', className)
  return to ? (
    <Link ref={ref} to={to} className={cls}>
      {children}
    </Link>
  ) : (
    <div ref={ref} className={cls} {...rest}>
      {children}
    </div>
  )
})

/** Glass panel with an optional title row. */
export function Panel({ title, action, children, className, neu }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; neu?: boolean }) {
  return (
    <section data-rise className={cx(neu ? 'neu' : 'glass glass-sheen', 'rounded-[24px] p-4 md:p-5', className)}>
      {title && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-h3 font-semibold">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
