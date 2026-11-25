import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, BellRing, Check, ChevronDown, CircleHelp, ClipboardList, Home, Menu, MessageCircle, Pill, Plus, Search, Settings, Share2, ShieldAlert, Sparkles, Stethoscope, Users, type LucideIcon } from 'lucide-react'
import { LogoDraw } from '../components/CheckDraw'
import { EmptyArt } from '../components/art'
import { useApp } from '../state/store'
import { useT } from '../i18n'
import { Avatar, Button, cx } from '../components/ui'
import { OfflineBanner, StatusChip } from '../components/status'
import { Sheet } from '../components/overlays'
import { age } from '../lib/format'
import { gsap, MOTION_OK } from '../lib/motion'

/** H52 profile switcher: avatar + name always shows whose profile is open */
export function ProfileSwitcher() {
  const { s, profile, mutate, role } = useApp()
  const t = useT()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={t('Profile: {name}. Switch profile', { name: profile.name })}
        className="btn flex min-h-12 min-w-0 items-center gap-2 rounded-full py-1 pr-2 pl-1 hover:bg-primary-50"
      >
        <Avatar name={profile.name} size={36} />
        <span className="truncate font-semibold">{profile.name.split(' ')[0]}</span>
        <ChevronDown className="size-4 shrink-0 text-ink-700" aria-hidden />
      </button>
      {role === 'caregiver-view' && <StatusChip status="viewonly" />}
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={t('Whose profile?')}
        footer={
          <Button
            full
            variant="secondary"
            icon={Users}
            onClick={() => {
              setOpen(false)
              nav('/family')
            }}
          >
            {t('Manage family')}
          </Button>
        }
      >
        <ul className="flex flex-col gap-2">
          {s.profiles.map((p) => {
            const on = p.id === s.activeProfileId
            return (
              <li key={p.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    mutate((d) => {
                      d.activeProfileId = p.id
                    })
                    setOpen(false)
                  }}
                  className={cx('flex min-h-16 w-full items-center gap-3 rounded-card border px-3 text-left', on ? 'border-2 border-primary-600 bg-primary-50' : 'border-border-subtle bg-surface hover:bg-primary-50')}
                >
                  <Avatar name={p.name} size={44} />
                  <span className="flex-1">
                    <span className="block font-semibold">{p.name}</span>
                    <span className="block text-small text-ink-700">
                      {t(p.relation === 'self' ? 'You' : relationLabel(p.relation))} · {age(p.dob)} {t('years')}
                    </span>
                  </span>
                  {on && <Check className="size-6 text-primary-600" aria-label={t('Selected')} />}
                </button>
              </li>
            )
          })}
        </ul>
      </Sheet>
    </>
  )
}

export const relationLabel = (r: string) => ({ mother: 'Mother', father: 'Father', sister: 'Sister', brother: 'Brother', spouse: 'Spouse', child: 'Child', other: 'Family member', self: 'You' })[r] ?? 'Family member'

function TopBar() {
  const { s } = useApp()
  const t = useT()
  const unread = s.notifications.filter((n) => !n.read).length
  return (
    <header className="sticky top-0 z-30 bg-surface shadow-bar">
      <div className="flex h-16 items-center gap-2 px-2 lg:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <ProfileSwitcher />
        </div>
        {s.settings.textSize < 1.5 && (
          <span className="text-body font-bold text-primary-700 lg:hidden" aria-hidden>
            MedGuard
          </span>
        )}
        <NavLink to="/notifications" aria-label={unread ? t('Notifications, {n} unread', { n: unread }) : t('Notifications')} className="relative grid size-12 place-items-center rounded-full hover:bg-primary-50">
          <Bell className="size-6" strokeWidth={1.75} />
          {unread > 0 && <span className="absolute top-2 right-2 grid h-5 min-w-5 place-items-center rounded-full bg-danger-text px-1 text-caption font-semibold text-white">{unread}</span>}
        </NavLink>
      </div>
      <OfflineBanner />
      <HighBanner />
    </header>
  )
}

/**
 * High tier (theme prompt, alerts): banner under the top bar, tint + icon, one action.
 * Stays until someone acts. Sound once + vibrate when it first appears. Never a full-screen takeover.
 */
function HighBanner() {
  const { s, mutate } = useApp()
  const t = useT()
  const nav = useNavigate()
  const n = s.notifications.find((x) => x.tier === 'high' && !x.read && Date.now() - new Date(x.at).getTime() < 86400000)
  const seen = useRef<string | null>(null)
  useEffect(() => {
    if (!n || seen.current === n.id) return
    seen.current = n.id
    try {
      if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(200)
      const ctx = new AudioContext()
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = 880
      g.gain.setValueAtTime(0.08, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4)
      o.connect(g).connect(ctx.destination)
      o.start()
      o.stop(ctx.currentTime + 0.4)
    } catch {
      /* audio blocked until the user interacts: the visual banner still shows */
    }
  }, [n])
  if (!n) return null
  const danger = n.kind === 'emergency'
  const Icon = danger ? ShieldAlert : BellRing
  return (
    <div role="alert" className={cx('flex items-center gap-3 border-b px-4 py-2', danger ? 'border-danger-border bg-danger-bg text-danger-text' : 'border-warning-border bg-warning-bg text-warning-text')}>
      <Icon className="size-5 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 text-small font-semibold">{n.title}</p>
      <button
        type="button"
        onClick={() => {
          mutate((d) => void (d.notifications.find((x) => x.id === n.id)!.read = true))
          if (n.link) nav(n.link)
        }}
        className={cx('btn min-h-12 shrink-0 rounded-control border bg-surface px-3 text-small font-semibold', danger ? 'border-danger-text' : 'border-warning-text')}
      >
        {t('Open')}
      </button>
    </div>
  )
}

function BottomNav() {
  const t = useT()
  const { s } = useApp()
  const items = [
    { to: '/home', icon: Home, label: 'Home' },
    { to: '/record', icon: ClipboardList, label: 'Record' },
    { to: '/upload', icon: Plus, label: 'Upload', raised: true },
    { to: '/ai', icon: MessageCircle, label: 'Ask AI' },
    { to: '/menu', icon: Menu, label: 'Menu' },
  ]
  return (
    <nav aria-label={t('Main')} style={{ '--ts': Math.min(s.settings.textSize, 1.25) } as React.CSSProperties} className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border-subtle bg-surface shadow-bar lg:hidden">
      <ul className="flex h-16 items-stretch">
        {items.map(({ to, icon: Icon, label, raised }) => (
          <li key={to} className="flex-1">
            <NavLink to={to} className="group flex h-full flex-col items-center justify-center gap-0.5 text-caption font-semibold">
              {({ isActive }) =>
                raised ? (
                  <>
                    <span className="btn -mt-6 grid size-14 place-items-center rounded-full bg-primary-600 text-white shadow-float group-hover:bg-primary-700">
                      <Icon className="size-7" strokeWidth={2} aria-hidden />
                    </span>
                    <span className={isActive ? 'text-primary-700' : 'text-ink-700'}>{t(label)}</span>
                  </>
                ) : (
                  <>
                    <span className={cx('grid h-8 w-14 place-items-center rounded-full transition-colors', isActive ? 'bg-primary-100 text-primary-700' : 'text-ink-700')}>
                      <Icon className="size-6" strokeWidth={1.75} aria-hidden />
                    </span>
                    <span className={isActive ? 'text-primary-700' : 'text-ink-700'}>{t(label)}</span>
                  </>
                )
              }
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * Desktop sidebar (theme prompt: 248 px, white; active item primary-50 background,
 * primary-700 text, 3 px blue bar on the left). Shown from 1024 px; phones keep the bottom nav.
 */
function Sidebar() {
  const { s } = useApp()
  const t = useT()
  const unread = s.notifications.filter((n) => !n.read).length
  const items: { to: string; icon: LucideIcon; label: string; badge?: number }[] = [
    ...(s.account.type === 'doctor' ? [{ to: '/doctor', icon: Stethoscope, label: 'Doctor home' }] : []),
    { to: '/home', icon: Home, label: 'Home' },
    { to: '/record', icon: ClipboardList, label: 'My Record' },
    { to: '/ai', icon: MessageCircle, label: 'Ask AI' },
    { to: '/medicines', icon: Pill, label: 'Medicines' },
    { to: '/similar', icon: Search, label: 'Similar cases' },
    { to: '/share/access', icon: Share2, label: 'Share and access' },
    { to: '/family', icon: Users, label: 'Family' },
    { to: '/notifications', icon: Bell, label: 'Notifications', badge: unread },
    { to: '/premium', icon: Sparkles, label: 'Premium' },
    { to: '/settings', icon: Settings, label: 'Settings' },
    { to: '/help', icon: CircleHelp, label: 'Help' },
  ]
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-border-subtle bg-surface lg:flex">
      <div className="flex h-16 items-center gap-2 px-6">
        <LogoDraw size={32} />
        <span className="text-h3 font-bold text-primary-700">MedGuard</span>
      </div>
      <div className="px-4 pt-2 pb-4">
        <NavLink to="/upload" className="btn flex min-h-12 items-center justify-center gap-2 rounded-control bg-primary-600 px-4 font-semibold text-white hover:bg-primary-700">
          <Plus className="size-5" strokeWidth={2} aria-hidden /> {t('Upload')}
        </NavLink>
      </div>
      <nav aria-label={t('Main')} className="flex-1 overflow-y-auto pb-6">
        <ul className="flex flex-col gap-1">
          {items.map(({ to, icon: Icon, label, badge }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cx(
                    'relative flex min-h-12 items-center gap-3 px-6 font-semibold transition-colors',
                    isActive ? 'bg-primary-50 text-primary-700 before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-primary-600' : 'text-ink-700 hover:bg-primary-50',
                  )
                }
              >
                <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                <span className="flex-1">{t(label)}</span>
                {!!badge && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-danger-text px-2 text-caption font-semibold text-white">{badge}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

/**
 * Signed-in shell. Phone and tablet: top bar + bottom nav. Desktop (1024 px and up): left sidebar,
 * top bar keeps the profile switcher, content up to 1200 px. Page change: a 200 ms fade-up.
 */
export function AppLayout() {
  const loc = useLocation()
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    window.scrollTo(0, 0)
    const mm = gsap.matchMedia()
    mm.add(MOTION_OK, () => {
      gsap.fromTo(ref.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.2, clearProps: 'all' })
    })
    return () => mm.revert()
  }, [loc.pathname])
  return (
    <div className="min-h-dvh bg-page">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-surface focus:p-3">
        Skip to content
      </a>
      <Sidebar />
      <div className="pb-24 lg:pb-8 lg:pl-[248px]">
        <TopBar />
        <main id="main" ref={ref} className="mx-auto w-full max-w-[1200px]">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}

/** Onboarding and auth. Phone: one column. Desktop: brand panel on the left, the form column on the right. */
export function BareLayout() {
  const t = useT()
  return (
    <div className="min-h-dvh bg-page lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(480px,560px)]">
      <aside className="sticky top-0 hidden h-dvh flex-col justify-between bg-primary-50 p-12 lg:flex" aria-hidden>
        <div className="flex items-center gap-3">
          <LogoDraw size={48} />
          <span className="text-h1 font-bold text-primary-700">MedGuard</span>
        </div>
        <div className="max-w-md">
          <EmptyArt kind="docs" />
          <p className="mt-6 text-display font-bold text-ink-900">{t('One record for every report')}</p>
          <p className="mt-2 text-body text-ink-700">{t('You decide who sees your record. Every view is logged, and you are told when a hospital opens it.')}</p>
        </div>
        <p className="text-small text-ink-700">{t('Made by Team O(1), Ahsanullah University of Science and Technology.')}</p>
      </aside>
      <div className="app-col lg:max-w-none lg:border-l lg:border-border-subtle lg:bg-surface">
        <OfflineBanner />
        <main id="main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

/** Full-width shell for the 3D Welcome screen */
export function WideLayout() {
  return (
    <div className="min-h-dvh bg-page">
      <OfflineBanner />
      <main id="main">
        <Outlet />
      </main>
    </div>
  )
}
