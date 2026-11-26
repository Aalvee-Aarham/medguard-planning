import { Bell, Building2 } from 'lucide-react';
import { WARDS } from '../mock/data';
import { useStore, useT, type Lang } from '../state/store';

function LiveStatus() {
  const { serverDown, liveOn } = useStore();
  const t = useT();
  const [dot, text, word] = serverDown
    ? ['bg-danger-text', 'text-danger-text', t('top.offline')]
    : liveOn
      ? ['bg-success-text', 'text-success-text', t('top.live')]
      : ['bg-ink-500', 'text-ink-700', t('top.paused')];
  return (
    <span className={`inline-flex items-center gap-2 text-sm font-semibold ${text}`}>
      <span aria-hidden className={`h-2 w-2 rounded-full ${dot} ${liveOn && !serverDown ? 'animate-pulse' : ''}`} />
      {word}
    </span>
  );
}

export function TopBar() {
  const { ward, wardId, user, role, lang, openAlerts, alertsOpen, dispatch } = useStore();
  const t = useT();
  const initials = user.name.split(' ').map((p) => p[0]).join('');

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-6 border-b border-border-subtle bg-surface px-8 shadow-bar">
      <label className="flex items-center gap-2">
        <span className="sr-only">{t('top.ward')}</span>
        <select
          value={wardId}
          onChange={(e) => dispatch({ type: 'set-ward', wardId: e.target.value })}
          className="h-10 rounded-control border border-border-input bg-surface pl-3 pr-8 font-semibold"
        >
          {WARDS.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </label>

      <span className="inline-flex items-center gap-2 text-ink-700">
        <Building2 size={20} strokeWidth={1.75} aria-hidden />
        {ward.hospital}
      </span>

      <LiveStatus />

      <div className="ml-auto flex items-center gap-4">
        <div role="group" aria-label={t('top.language')} className="flex rounded-control border border-border-input p-1">
          {(['en', 'bn'] as Lang[]).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={lang === l}
              onClick={() => dispatch({ type: 'set-lang', lang: l })}
              className={`h-8 rounded-[6px] px-3 text-sm font-semibold ${lang === l ? 'bg-primary-100 text-primary-700' : 'text-ink-700 hover:bg-page'}`}
            >
              {l === 'en' ? 'English' : 'বাংলা'}
            </button>
          ))}
        </div>

        <button
          type="button"
          aria-expanded={alertsOpen}
          aria-controls="alerts-panel"
          onClick={() => dispatch({ type: 'alerts-open', open: !alertsOpen })}
          className="btn-secondary relative"
        >
          <Bell size={20} strokeWidth={1.75} aria-hidden />
          {t('top.alerts')}
          <span className={`rounded-full px-2 text-sm tabular-nums ${openAlerts ? 'bg-danger-text text-surface' : 'bg-neutral-bg text-neutral-text'}`}>
            {openAlerts}
          </span>
        </button>

        <div className="flex items-center gap-3 border-l border-border-subtle pl-4">
          <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700">
            {initials}
          </span>
          <div className="leading-5">
            <div className="font-semibold">{user.name}</div>
            <div className="text-sm text-ink-700">{t(`role.${role}`)}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
