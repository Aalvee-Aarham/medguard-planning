import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Bell, Check, ChevronRight, CircleHelp, Download, Fingerprint, Globe, Info, KeyRound, Lock, LogOut, Mail, MessageSquare, Pencil, Phone, Shield, ShieldCheck, Smartphone, Sparkles, Trash2, Type, UserRound, X,
  type LucideIcon,
} from 'lucide-react'
import { useApp } from '../../state/store'
import { useT } from '../../i18n'
import { cx, Note } from '../../components/ui'
import { ConfirmDialog } from '../../components/overlays'
import { GlassPage, Segmented } from '../../components/glass'
import { useTilt } from '../../lib/tilt'
import { gsap, MOTION_OK } from '../../lib/motion'
import { fmtDate } from '../../lib/format'

/**
 * S1 Settings home: an account ID card, a 3D security shield whose score comes from the real settings,
 * quick controls for language and text size (same writes as S8 and S9), and the settings grouped into
 * glass panels. Log out keeps its confirm dialog (S17).
 */
export function SettingsHome() {
  const { s, mutate, toast } = useApp()
  const t = useT()
  const nav = useNavigate()
  const [out, setOut] = useState(false)
  const card = useRef<HTMLDivElement>(null)
  useTilt(card, 8)

  const checks = [
    { ok: s.settings.biometric, label: t('Unlock with fingerprint'), icon: Fingerprint, to: '/settings/security' },
    { ok: s.settings.autoLockMin <= 5, label: t('App locks after {n} min', { n: s.settings.autoLockMin }), icon: Lock, to: '/settings/security' },
    { ok: (s.account.pin ?? '').length === 4, label: t('App PIN set'), icon: KeyRound, to: '/settings/security' },
    { ok: !!s.account.email, label: t('Recovery email'), icon: Mail, to: '/settings/email' },
  ]
  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100)
  const premium = s.subscription.plan === 'premium'
  const sizes = [1, 1.25, 1.5, 2] as const

  const groups: { title: string; icon: LucideIcon; rows: { icon: LucideIcon; title: string; sub?: ReactNode; to: string; danger?: boolean }[] }[] = [
    {
      title: t('Account'),
      icon: UserRound,
      rows: [
        { icon: UserRound, title: t('Personal info'), sub: s.account.name, to: '/settings/personal' },
        { icon: Phone, title: t('Phone number'), sub: <span className="tabular">{s.account.phone}</span>, to: '/settings/phone' },
        { icon: Mail, title: t('Email'), sub: s.account.email, to: '/settings/email' },
        { icon: KeyRound, title: t('Password'), to: '/settings/password' },
        { icon: Smartphone, title: t('Sign-in methods'), to: '/settings/sign-in' },
        { icon: Shield, title: t('Security'), to: '/settings/security' },
      ],
    },
    {
      title: t('App'),
      icon: Smartphone,
      rows: [
        { icon: Globe, title: t('Language'), sub: s.settings.lang === 'bn' ? 'বাংলা' : 'English', to: '/settings/language' },
        { icon: Type, title: t('Text size'), sub: `${Math.round(s.settings.textSize * 100)}%`, to: '/settings/text-size' },
        { icon: Bell, title: t('Notifications'), to: '/settings/notifications' },
      ],
    },
    {
      title: t('Your data'),
      icon: ShieldCheck,
      rows: [
        { icon: ShieldCheck, title: t('Privacy and consents'), to: '/settings/privacy' },
        { icon: Download, title: t('Download my data'), to: '/settings/export' },
        { icon: Trash2, title: t('Delete account'), to: '/settings/delete', danger: true },
      ],
    },
    {
      title: t('Support'),
      icon: CircleHelp,
      rows: [
        { icon: CircleHelp, title: t('Help and FAQ'), to: '/help' },
        { icon: MessageSquare, title: t('Contact support'), to: '/help/contact' },
        { icon: Info, title: t('About and legal'), to: '/about' },
      ],
    },
  ]

  return (
    <GlassPage>
      <header data-rise className="mb-5 flex items-center gap-3">
        <button type="button" aria-label={t('Back')} onClick={() => nav(-1)} className="neu neu-press grid size-12 shrink-0 place-items-center rounded-2xl text-ink-900">
          <ArrowLeft className="size-5" strokeWidth={2} />
        </button>
        <div>
          <p className="text-caption font-semibold tracking-[0.18em] text-primary-600 uppercase">{t('Account')} · {t('App')} · {t('Your data')}</p>
          <h1 className="text-h1 font-bold tracking-tight text-ink-900 md:text-display">{t('Settings')}</h1>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {/* Account ID card */}
        <div data-rise className="[perspective:1200px]">
          <div ref={card} className="passport tilt group relative h-full min-h-[240px] overflow-hidden rounded-[28px] p-5 md:p-6">
            <div aria-hidden className="passport-guilloche absolute inset-0" />
            <div aria-hidden className="passport-holo absolute inset-0 opacity-60 group-hover:opacity-100" />
            <div aria-hidden className="settings-gear absolute -right-16 -bottom-20 size-72 opacity-20" />
            <div className="relative flex h-full flex-col gap-5">
              <div className="flex items-start justify-between gap-3">
                <span className="font-mono text-caption font-bold tracking-[0.22em] uppercase opacity-90">MedGuard · {t('Account')}</span>
                <span className={cx('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-bold', premium ? 'plan-premium text-ink-900' : 'bg-white/20 backdrop-blur')}>
                  <Sparkles className="size-3.5" strokeWidth={2} aria-hidden /> {premium ? t('Premium') : t('Free plan')}
                </span>
              </div>
              <div className="pop flex items-center gap-4">
                <span className="settings-avatar grid size-20 shrink-0 place-items-center rounded-[24px] text-h1 font-bold md:size-24" aria-hidden>
                  {s.account.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                </span>
                <div className="min-w-0">
                  <p className="emboss text-h2 leading-tight font-bold break-words md:text-h1">{s.account.name}</p>
                  <p className="text-small opacity-90 tabular">{s.account.phone}</p>
                  {s.account.email && <p className="truncate text-small opacity-90">{s.account.email}</p>}
                </div>
              </div>
              <div className="mt-auto flex flex-wrap items-end justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span aria-hidden className="passport-chip h-9 w-12 rounded-md" />
                  <span className="text-caption opacity-80">
                    {t('Member since')}
                    <br />
                    <span className="font-mono text-small font-bold opacity-100 tabular">{fmtDate(s.account.createdAt)}</span>
                  </span>
                </div>
                <div className="flex gap-2">
                  {!premium && (
                    <Link to="/premium" className="btn inline-flex min-h-11 items-center gap-1.5 rounded-2xl bg-white/15 px-3 text-small font-semibold backdrop-blur hover:bg-white/25">
                      <Sparkles className="size-4" strokeWidth={2} aria-hidden /> {t('Get Premium')}
                    </Link>
                  )}
                  <Link to="/settings/personal" className="btn inline-flex min-h-11 items-center gap-1.5 rounded-2xl bg-white px-3 text-small font-semibold text-primary-700">
                    <Pencil className="size-4" strokeWidth={2} aria-hidden /> {t('Edit')}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security shield */}
        <section data-rise aria-labelledby="sec-h" className="glass glass-sheen flex flex-col gap-4 rounded-[28px] p-5 sm:flex-row sm:items-center md:p-6">
          <SecurityShield score={score} />
          <div className="min-w-0 flex-1">
            <h2 id="sec-h" className="text-h3 font-semibold">{t('Security check')}</h2>
            <p className="mb-2 text-small text-ink-700 tabular">{t('{n} of {max} on', { n: checks.filter((c) => c.ok).length, max: checks.length })}</p>
            <ul className="flex flex-col gap-1">
              {checks.map((c) => (
                <li key={c.label}>
                  <Link to={c.to} className="group flex min-h-10 items-center gap-2.5 rounded-xl px-2 py-1 transition-colors hover:bg-primary-50">
                    <span className={cx('grid size-6 shrink-0 place-items-center rounded-full text-white', c.ok ? 'bg-success-text' : 'bg-warning-text')}>
                      {c.ok ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : <X className="size-3.5" strokeWidth={3} aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1 text-small font-semibold text-ink-900">
                      {c.label}
                      <span className="sr-only">: {c.ok ? t('On') : t('Off')}</span>
                    </span>
                    <ChevronRight className="size-4 text-ink-500 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {/* Quick controls */}
      <section data-rise aria-label={t('Quick actions')} className="neu mt-5 grid gap-4 rounded-[28px] p-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-6 md:p-5">
        <div className="flex items-center gap-3">
          <span className="skeuo-icon grid size-11 shrink-0 place-items-center rounded-xl">
            <Globe className="size-5" strokeWidth={1.75} aria-hidden />
          </span>
          <Segmented
            label={t('Language')}
            value={s.settings.lang}
            onChange={(lang) => {
              mutate((d) => void (d.settings.lang = lang))
              toast(lang === 'bn' ? 'ভাষা বদলানো হয়েছে' : 'Language changed')
            }}
            options={[
              { value: 'en', label: 'English' },
              { value: 'bn', label: 'বাংলা' },
            ]}
          />
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <span className="skeuo-icon grid size-11 shrink-0 place-items-center rounded-xl">
            <Type className="size-5" strokeWidth={1.75} aria-hidden />
          </span>
          <div role="radiogroup" aria-label={t('Text size')} className="neu-inset grid flex-1 grid-cols-4 gap-1 rounded-2xl p-1">
            {sizes.map((z) => {
              const on = s.settings.textSize === z
              return (
                <button
                  key={z}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={`${z * 100}%`}
                  onClick={() => mutate((d) => void (d.settings.textSize = z))}
                  className={cx('flex min-h-11 items-end justify-center gap-1 rounded-xl px-1 pb-1.5 font-semibold transition-all duration-200', on ? 'neu text-primary-700' : 'text-ink-700 hover:text-ink-900')}
                >
                  <span style={{ fontSize: 12 + (z - 1) * 12, lineHeight: 1 }}>Aa</span>
                  <span className="hidden text-caption tabular sm:inline">{z * 100}%</span>
                </button>
              )
            })}
          </div>
        </div>
        <Link to="/settings/notifications" className="neu neu-press inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 font-semibold text-ink-900">
          <Bell className="bell-ring size-5 text-primary-600" strokeWidth={1.75} aria-hidden /> {t('Notifications')}
        </Link>
      </section>

      {/* Settings groups */}
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        {groups.map((g) => (
          <section key={g.title} data-rise aria-labelledby={`g-${g.title}`} className="glass glass-sheen rounded-[24px] p-2 md:p-3">
            <h2 id={`g-${g.title}`} className="flex items-center gap-2 px-3 pt-2 pb-1 text-caption font-bold tracking-[0.16em] text-primary-600 uppercase">
              <g.icon className="size-4" strokeWidth={2} aria-hidden /> {g.title}
            </h2>
            <ul>
              {g.rows.map((r) => (
                <li key={r.to + r.title}>
                  <Link to={r.to} className={cx('set-row group flex min-h-14 items-center gap-3 rounded-2xl px-3 py-2', r.danger && 'is-danger')}>
                    <span className={cx('set-icon grid size-10 shrink-0 place-items-center rounded-xl', r.danger ? 'danger' : 'skeuo-icon')}>
                      <r.icon className="size-5" strokeWidth={1.75} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cx('block font-semibold', r.danger ? 'text-danger-text' : 'text-ink-900')}>{r.title}</span>
                      {r.sub && <span className="block truncate text-small text-ink-700">{r.sub}</span>}
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-ink-500 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <button type="button" onClick={() => setOut(true)} className="neu neu-press mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-4 font-semibold text-primary-700">
        <LogOut className="size-5" strokeWidth={1.75} aria-hidden /> {t('Log out')}
      </button>
      <LogOutDialog open={out} onClose={() => setOut(false)} />
    </GlassPage>
  )
}

/** CSS-3D shield: stacked layers give it thickness, it sways, an orbit ring circles it, and the score ring fills once. */
function SecurityShield({ score }: { score: number }) {
  const ring = useRef<SVGCircleElement>(null)
  const num = useRef<HTMLSpanElement>(null)
  const C = 2 * Math.PI * 54
  const good = score >= 75
  useEffect(() => {
    const mm = gsap.matchMedia()
    mm.add(MOTION_OK, () => {
      gsap.fromTo(ring.current, { strokeDashoffset: C }, { strokeDashoffset: C * (1 - score / 100), duration: 1.2, ease: 'power3.out', delay: 0.2 })
      const o = { v: 0 }
      gsap.to(o, { v: score, duration: 1.2, ease: 'power3.out', delay: 0.2, onUpdate: () => num.current && (num.current.textContent = String(Math.round(o.v))) })
    })
    return () => mm.revert()
  }, [score, C])
  return (
    <div className="shield-stage relative mx-auto grid size-40 shrink-0 place-items-center" style={{ '--sc': good ? 'var(--color-success-text)' : 'var(--color-warning-text)' } as CSSProperties} aria-hidden>
      <svg viewBox="0 0 120 120" className="absolute inset-0 size-full -rotate-90">
        <circle cx="60" cy="60" r="54" fill="none" stroke="var(--color-primary-100)" strokeWidth="6" />
        <circle ref={ring} cx="60" cy="60" r="54" fill="none" stroke="var(--sc)" strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - score / 100)} />
      </svg>
      <span className="shield-orbit" />
      <div className="shield-rot">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="shield-layer" style={{ '--z': `${-i * 3}px`, '--d': i } as CSSProperties} />
        ))}
        <span className="shield-face grid place-items-center text-white">
          <span className="flex flex-col items-center leading-none">
            <ShieldCheck className="mb-0.5 size-5" strokeWidth={2} />
            <span className="text-h2 font-bold tabular">
              <span ref={num}>{score}</span>
              <span className="text-caption">%</span>
            </span>
          </span>
        </span>
      </div>
    </div>
  )
}

/** S17 Log out: confirm; warns if unsynced actions */
function LogOutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s, mutate } = useApp()
  const t = useT()
  const nav = useNavigate()
  const n = s.queue.length
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title={t('Log out of MedGuard?')}
      body={n ? <Note tone="warning">{t('{n} actions have not synced yet. They will be lost if you log out now.', { n })}</Note> : t('Your record stays safe. Sign in again to see it.')}
      confirmLabel={t('Log out')}
      destructive={n > 0}
      onConfirm={() => {
        mutate((d) => {
          d.session = { signedIn: false, locked: false }
          d.queue = []
        })
        nav('/auth', { replace: true })
      }}
    />
  )
}
