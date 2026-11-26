// Right drawer, 360 px, opens on any page. Alerts are grouped by tier.
import { Bell, CircleCheck, Clock, Eye, BedDouble, Hand, Siren, Wrench, X, type LucideIcon } from 'lucide-react';
import { useEffect } from 'react';
import type { Alert, AlertKind, AlertTier } from '../mock/types';
import { useStore, useT } from '../state/store';
import { formatTime, since } from '../utils/format';

export const KIND_ICON: Record<AlertKind, LucideIcon> = {
  fall: Siren, overdue: Clock, visit: Eye, bed: BedDouble, request: Hand, test: Wrench,
};

export const TIER_STYLE: Record<AlertTier, string> = {
  critical: 'border-danger-border bg-danger-bg text-danger-text',
  high: 'border-warning-border bg-warning-bg text-warning-text',
  normal: 'border-primary-100 bg-primary-50 text-primary-600',
};

function AlertCard({ alert }: { alert: Alert }) {
  const { dispatch, user, toast, serverDown } = useStore();
  const t = useT();
  const Icon = KIND_ICON[alert.kind];
  const ago = since(alert.at);

  return (
    <li className={`rounded-card border p-3 ${alert.acknowledged ? 'border-border-subtle bg-surface' : TIER_STYLE[alert.tier]}`}>
      <div className="flex items-start gap-3">
        <Icon size={20} strokeWidth={1.75} aria-hidden className={`mt-1 shrink-0 ${alert.acknowledged ? 'text-ink-500' : ''}`} />
        <div className="min-w-0 flex-1">
          <div className={`font-semibold ${alert.acknowledged ? 'text-ink-700' : ''}`}>{t(alert.title.key, alert.title.vars)}</div>
          <p className="mt-1 text-sm text-ink-700">{t(alert.detail.key, alert.detail.vars)}</p>
          <p className="mt-1 text-xs text-ink-500 tabular-nums">
            {formatTime(alert.at)} · {t(`time.${ago.unit}`, { n: ago.n })}
          </p>
          {alert.acknowledged ? (
            <p className="mt-2 inline-flex items-center gap-1 text-sm text-success-text">
              <CircleCheck size={16} aria-hidden />
              {alert.acknowledgedBy ? t('alerts.ackBy', { name: alert.acknowledgedBy }) : t('alerts.acknowledged')}
            </p>
          ) : (
            <button
              type="button"
              disabled={serverDown}
              onClick={() => {
                dispatch({ type: 'ack', id: alert.id, by: user.name });
                toast(t('alerts.ackToast'));
              }}
              className="btn-secondary mt-2 h-10"
            >
              {t('alerts.acknowledge')}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

export function AlertsPanel() {
  const { alerts, alertsOpen, dispatch } = useStore();
  const t = useT();

  useEffect(() => {
    if (!alertsOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dispatch({ type: 'alerts-open', open: false });
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [alertsOpen, dispatch]);

  const open = alerts.filter((a) => !a.acknowledged);
  const done = alerts.filter((a) => a.acknowledged);
  const tiers: AlertTier[] = ['critical', 'high', 'normal'];

  return (
    <aside
      id="alerts-panel"
      aria-label={t('alerts.title')}
      aria-hidden={!alertsOpen}
      inert={!alertsOpen}
      className={`fixed right-0 top-0 z-40 flex h-screen w-[360px] flex-col border-l border-border-subtle bg-surface shadow-float transition-transform duration-200 ease-out motion-reduce:transition-none ${
        alertsOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-border-subtle px-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Bell size={20} strokeWidth={1.75} aria-hidden />
          {t('alerts.title')} <span className="tabular-nums text-ink-700">({open.length})</span>
        </h2>
        <button type="button" aria-label={t('alerts.close')} onClick={() => dispatch({ type: 'alerts-open', open: false })} className="btn-icon">
          <X size={20} aria-hidden />
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {open.length === 0 && (
          <div className="py-8 text-center">
            <CircleCheck size={24} aria-hidden className="mx-auto text-success-text" />
            <p className="mt-2 font-semibold">{t('alerts.none')}</p>
            <p className="text-sm text-ink-700">{t('alerts.noneHint')}</p>
          </div>
        )}

        {tiers.map((tier) => {
          const list = open.filter((a) => a.tier === tier);
          if (!list.length) return null;
          return (
            <section key={tier}>
              <h3 className="mb-2 text-sm font-semibold text-ink-700">{t(`alerts.${tier}`)} ({list.length})</h3>
              <ul className="space-y-2">{list.map((a) => <AlertCard key={a.id} alert={a} />)}</ul>
            </section>
          );
        })}

        {done.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold text-ink-700">{t('alerts.acknowledged')} ({done.length})</h3>
            <ul className="space-y-2">{done.slice(0, 10).map((a) => <AlertCard key={a.id} alert={a} />)}</ul>
          </section>
        )}
      </div>
    </aside>
  );
}
