import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, BellRing, Check, ChevronDown, ChevronRight, CircleHelp, ClipboardList, Home, LayoutGrid, Menu, MessageCircle, Pill, Plus, Search, Settings, Share2, ShieldAlert, Sparkles, Stethoscope, Users, type LucideIcon } from 'lucide-react'
import { LogoDraw } from '../components/CheckDraw'
import { EmptyArt } from '../components/art'
import { useApp } from '../state/store'
import { useT } from '../i18n'
import { Avatar, Button, cx } from '../components/ui'
import { OfflineBanner, StatusChip } from '../components/status'
import { Sheet } from '../components/overlays'
import { age } from '../lib/format'
import { gsap, MOTION_OK, prefersReduced } from '../lib/motion'

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
    <header className="topbar sticky top-0 z-30">
      <div className="flex h-16 items-center gap-2 px-2 lg:h-[76px] lg:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <ProfileSwitcher />
        </div>
        {s.settings.textSize < 1.5 && (
          <span className="text-body font-bold text-primary-700 lg:hidden" aria-hidden>
            MedGuard
          </span>
        )}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <TopIcon to="/help" icon={CircleHelp} label={t('Help')} className="hidden sm:grid" />
          <TopIcon to="/settings" icon={Settings} label={t('Settings')} className="hidden sm:grid" spin />
          <TopIcon to="/notifications" icon={Bell} label={unread ? t('Notifications, {n} unread', { n: unread }) : t('Notifications')} tip={t('Notifications')} badge={unread} ring />
          <MoreMenu />
        </div>
      </div>
      <OfflineBanner />
      <HighBanner />
    </header>
  )
}

/** Round glass icon button for the top bar, with a label that drops in on hover or focus */
function TopIcon({ to, icon: Icon, label, tip, badge, className, spin, ring }: { to: string; icon: LucideIcon; label: string; tip?: string; badge?: number; className?: string; spin?: boolean; ring?: boolean }) {
  return (
    <NavLink to={to} aria-label={label} className={({ isActive }) => cx('top-icon group relative size-11 place-items-center rounded-2xl', !className && 'grid', className, isActive && 'is-active')}>
      <Icon className={cx('size-[22px] transition-transform duration-300', spin && 'group-hover:rotate-90', ring && 'group-hover:animate-[bell-ring_600ms_ease-in-out]')} strokeWidth={1.75} aria-hidden />
      {!!badge && <span className="badge-pop absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-danger-text px-1 text-caption font-semibold text-white">{badge}</span>}
      <span aria-hidden className="top-tip pointer-events-none absolute top-full left-1/2 mt-2 -translate-x-1/2 rounded-full px-2.5 py-1 text-caption font-semibold whitespace-nowrap">
        {tip ?? label}
      </span>
    </NavLink>
  )
}

/** "More" menu: Premium and Share and access (plus Help and Settings on phones, where the icons are hidden) */
function MoreMenu() {
  const t = useT()
  const loc = useLocation()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => setOpen(false), [loc.pathname])
  useEffect(() => {
    if (!open) return
    const off = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', off)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', off)
      document.removeEventListener('keydown', esc)
    }
  }, [open])
  const items: { to: string; icon: LucideIcon; label: string; sub: string; premium?: boolean; phone?: boolean }[] = [
    { to: '/premium', icon: Sparkles, label: 'Premium', sub: 'More profiles, searches and storage', premium: true },
    { to: '/share/access', icon: Share2, label: 'Share and access', sub: 'Who can see your record' },
    { to: '/help', icon: CircleHelp, label: 'Help', sub: 'Answers and support', phone: true },
    { to: '/settings', icon: Settings, label: 'Settings', sub: 'Account, app and your data', phone: true },
  ]
  return (
    <div ref={box} className="relative">
      <button type="button" aria-haspopup="true" aria-expanded={open} aria-label={t('More')} onClick={() => setOpen((o) => !o)} className={cx('top-icon group relative grid size-11 place-items-center rounded-2xl', open && 'is-active')}>
        <LayoutGrid className={cx('size-[22px] transition-transform duration-300', open ? 'rotate-45' : 'group-hover:rotate-45')} strokeWidth={1.75} aria-hidden />
        {!open && (
          <span aria-hidden className="top-tip pointer-events-none absolute top-full left-1/2 mt-2 -translate-x-1/2 rounded-full px-2.5 py-1 text-caption font-semibold whitespace-nowrap">
            {t('More')}
          </span>
        )}
      </button>
      {open && (
        <div className="more-pop absolute top-full right-0 z-40 mt-3 w-[300px] origin-top-right rounded-[24px] p-2">
          <ul className="flex flex-col gap-1">
            {items.map((it, i) => (
              <li key={it.to} className={cx(it.phone && 'sm:hidden')} style={{ '--i': i } as React.CSSProperties}>
                <NavLink to={it.to} className={({ isActive }) => cx('more-item group flex min-h-14 items-center gap-3 rounded-2xl p-2', it.premium && 'is-premium', isActive && 'is-active')}>
                  <span className={cx('grid size-11 shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105', it.premium ? 'premium-icon' : 'skeuo-icon')}>
                    <it.icon className="size-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink-900">{t(it.label)}</span>
                    <span className="block truncate text-caption text-ink-700">{t(it.sub)}</span>
                  </span>
                  <ChevronRight className="size-4 text-ink-500 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
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
 * Desktop sidebar: a floating glass dock of icon tiles, only as tall as its items, centred on the left edge and gently bobbing, (1024 px and up; phones keep the bottom nav).
 * Hover works like a dock: the tile under the pointer and its neighbours grow, the tile glows and
 * tilts, and its name slides out in a glass label. Labels also show on keyboard focus and stay in the
 * accessibility tree, so screen readers read every link by name. A glowing marker slides to the open page.
 * Settings, Help, Premium, Share and access and Notifications live in the top bar.
 */
function Sidebar() {
  const { s } = useApp()
  const t = useT()
  const loc = useLocation()
  const list = useRef<HTMLUListElement>(null)
  const [mark, setMark] = useState<{ y: number; on: boolean }>({ y: 0, on: false })
  const items: { to: string; icon: LucideIcon; label: string }[] = [
    ...(s.account.type === 'doctor' ? [{ to: '/doctor', icon: Stethoscope, label: 'Doctor home' }] : []),
    { to: '/home', icon: Home, label: 'Home' },
    { to: '/record', icon: ClipboardList, label: 'My Record' },
    { to: '/ai', icon: MessageCircle, label: 'Ask AI' },
    { to: '/medicines', icon: Pill, label: 'Medicines' },
    { to: '/similar', icon: Search, label: 'Similar cases' },
    { to: '/family', icon: Users, label: 'Family' },
  ]

  // slide the marker to the active tile
  useEffect(() => {
    const el = list.current?.querySelector<HTMLElement>('a.is-active')
    if (!el || !list.current) return setMark((m) => ({ ...m, on: false }))
    setMark({ y: el.offsetTop + el.offsetHeight / 2, on: true })
  }, [loc.pathname, items.length])

  // dock magnification: --m on each tile from its distance to the pointer
  useEffect(() => {
    const ul = list.current
    if (!ul || prefersReduced() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const tiles = () => Array.from(ul.querySelectorAll<HTMLElement>('.rail-tile'))
    let raf = 0
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        for (const el of tiles()) {
          const r = el.getBoundingClientRect()
          const d = Math.abs(e.clientY - (r.top + r.height / 2))
          const m = Math.max(0, 1 - d / 110)
          el.style.setProperty('--m', (m * m).toFixed(3))
          el.style.setProperty('--ry', `${((e.clientX - (r.left + r.width / 2)) / r.width) * 18}deg`)
          el.style.setProperty('--rx', `${(((r.top + r.height / 2) - e.clientY) / r.height) * 18}deg`)
        }
      })
    }
    const leave = () => {
      cancelAnimationFrame(raf)
      for (const el of tiles()) {
        el.style.setProperty('--m', '0')
        el.style.setProperty('--rx', '0deg')
        el.style.setProperty('--ry', '0deg')
      }
    }
    ul.addEventListener('pointermove', move)
    ul.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(raf)
      ul.removeEventListener('pointermove', move)
      ul.removeEventListener('pointerleave', leave)
    }
  }, [])

  return (
    <aside className="rail glass-strong fixed left-4 z-40 hidden w-[80px] flex-col items-center rounded-[32px] py-4 lg:flex">
      <NavLink to="/upload" aria-label={t('Upload')} className="rail-upload group relative grid size-14 place-items-center rounded-[20px] text-white">
        <Plus className="size-7 transition-transform duration-300 group-hover:rotate-90" strokeWidth={2.25} aria-hidden />
        <span aria-hidden className="rail-tip">{t('Upload')}</span>
      </NavLink>
      <nav aria-label={t('Main')} className="relative mt-5 flex w-full flex-col items-center">
        <span aria-hidden className={cx('rail-mark', mark.on && 'on')} style={{ transform: `translateY(${mark.y}px)` }} />
        <ul ref={list} className="flex flex-col items-center gap-2.5">
          {items.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink to={to} className={({ isActive }) => cx('rail-tile group relative grid size-[52px] place-items-center rounded-[18px]', isActive && 'is-active')}>
                <span aria-hidden className="rail-glow" />
                <Icon className="rail-ico relative size-6" strokeWidth={1.75} aria-hidden />
                <span className="rail-tip">{t(label)}</span>
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
      <div className="pb-24 lg:pb-8 lg:pl-[108px]">
        <TopBar />
        <main id="main" ref={ref} className="mx-auto w-full max-w-[1440px]">
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
