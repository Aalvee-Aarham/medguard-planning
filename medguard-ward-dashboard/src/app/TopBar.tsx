import { Bell, Building2, ChevronDown, Clock, Lock, LogOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { LangToggle } from '../components/LangToggle';
import { WARDS } from '../mock/data';
import { useStore, useT } from '../state/store';
import { formatTime } from '../utils/format';
import { useNow } from '../utils/hooks';

function LiveStatus() {
  const { serverDown, liveOn } = useStore();
  const t = useT();
  const [dot, chip, word] = serverDown
    ? ['bg-danger-text', 'border-danger-border bg-danger-bg text-danger-text', t('top.offline')]
    : liveOn
      ? ['bg-success-text', 'border-success-border bg-success-bg text-success-text', t('top.live')]
      : ['bg-ink-500', 'border-border-subtle bg-neutral-bg text-neutral-text', t('top.paused')];
  return (
    <span className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-sm font-semibold ${chip}`}>
      <span aria-hidden className={`h-2 w-2 rounded-full ${dot} ${liveOn && !serverDown ? 'animate-pulse' : ''}`} />
      {word}
    </span>
  );
}

/** Current time (12-hour, English digits), refreshed every 30 s. */
function WardClock() {
  const now = useNow();
  return (
    <span className="hidden items-center gap-2 text-sm font-semibold text-ink-700 tabular-nums xl:inline-flex">
      <Clock size={16} strokeWidth={1.75} aria-hidden />
      {formatTime(new Date(now).toISOString())}
    </span>
  );
}

/** Avatar + name; opens a small menu with Lock screen and Log out. */
function UserMenu() {
  const { user, role, dispatch, toast } = useStore();
  const t = useT();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const initials = user.name.split(' ').map((p) => p[0]).join('');

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <div ref={box} className="relative border-l border-border-subtle pl-4">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('user.menu')}
        title={`${user.name} · ${t(`role.${role}`)}`}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 rounded-control p-1 pr-2 text-left transition-colors duration-150 ease-out hover:bg-page"
      >
        <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-600 font-semibold text-surface ring-4 ring-primary-50">
          {initials}
        </span>
        {/* Name shows on wide screens; on narrow ones the initials stay and the name is in the tooltip. */}
        <span className="hidden leading-5 2xl:block">
          <span className="block font-semibold">{user.name}</span>
          <span className="block text-sm text-ink-700">{t(`role.${role}`)}</span>
        </span>
        <ChevronDown size={16} aria-hidden className="text-ink-700" />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-56 rounded-card border border-border-subtle bg-surface py-2 shadow-float">
          <div className="border-b border-border-subtle px-4 pb-2 2xl:hidden">
            <div className="font-semibold">{user.name}</div>
            <div className="text-sm text-ink-700">{t(`role.${role}`)}</div>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); dispatch({ type: 'lock', reason: 'manual' }); }}
            className="flex h-12 w-full items-center gap-3 px-4 hover:bg-primary-50"
          >
            <Lock size={20} strokeWidth={1.75} aria-hidden /> {t('user.lock')}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); dispatch({ type: 'logout' }); toast(t('user.loggedOut')); }}
            className="flex h-12 w-full items-center gap-3 px-4 hover:bg-primary-50"
          >
            <LogOut size={20} strokeWidth={1.75} aria-hidden /> {t('user.logout')}
          </button>
        </div>
      )}
    </div>
  );
}

export function TopBar() {
  const { ward, wardId, openAlerts, alertsOpen, dispatch } = useStore();
  const t = useT();

  return (
    <header className="flex h-16 items-center gap-4 whitespace-nowrap border-b border-border-subtle bg-surface px-8 shadow-bar 2xl:gap-6">
      {/* Ward switcher with the hospital underneath. The native select covers the whole block (48 px target). */}
      <label className="relative flex h-12 cursor-pointer items-center gap-3 rounded-control pl-1 pr-3 transition-colors duration-150 ease-out hover:bg-page focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary-600">
        <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-control bg-primary-50 text-primary-600">
          <Building2 size={20} strokeWidth={1.75} />
        </span>
        <span aria-hidden className="leading-5">
          <span className="flex items-center gap-1 font-semibold text-ink-900">
            {ward.name} <ChevronDown size={16} className="text-ink-700" />
          </span>
          <span className="block text-sm text-ink-700">{ward.hospital}</span>
        </span>
        <span className="sr-only">{t('top.ward')}</span>
        <select
          value={wardId}
          onChange={(e) => dispatch({ type: 'set-ward', wardId: e.target.value })}
          className="absolute inset-0 cursor-pointer opacity-0 focus:outline-none"
        >
          {WARDS.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </label>

      <span aria-hidden className="h-8 w-px bg-border-subtle" />
      <LiveStatus />
      <WardClock />

      <div className="ml-auto flex items-center gap-4">
        <LangToggle />

        <button
          type="button"
          aria-expanded={alertsOpen}
          aria-controls="alerts-panel"
          onClick={() => dispatch({ type: 'alerts-open', open: !alertsOpen })}
          className={`btn-secondary relative transition-colors duration-150 ease-out ${alertsOpen ? 'bg-primary-50' : ''}`}
        >
          <Bell size={20} strokeWidth={1.75} aria-hidden />
          {t('top.alerts')}
          <span className={`min-w-6 rounded-full px-2 text-center text-sm tabular-nums ${openAlerts ? 'bg-danger-text text-surface' : 'bg-neutral-bg text-neutral-text'}`}>
            {openAlerts}
          </span>
        </button>

        <UserMenu />
      </div>
    </header>
  );
}
