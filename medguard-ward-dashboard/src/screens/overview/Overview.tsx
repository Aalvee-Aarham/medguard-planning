// D3 Overview: stat tiles · bed map by status · live alert feed · staff on duty. Updates live from mock events.
// Calm layout: white and grey by default; blue only for links, the selected filter and "Occupied";
// red, amber and green only for status. Every status is colour + icon + word (safety rule 7).
import { ArrowRight, BedDouble, Bell, Clock, TriangleAlert, Users } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { KIND_ICON } from '../../app/AlertsPanel';
import { BedTile } from '../../components/BedTile';
import { BED_STATUS, Chip, type Tone } from '../../components/Chips';
import { Card, PageHeader } from '../../components/PageHeader';
import { StatTile } from '../../components/StatTile';
import { ErrorState, Skeleton } from '../../components/States';
import { DOSES_TODAY, SHIFT_RULE, STAFF } from '../../mock/data';
import type { AlertTier, BedStatus } from '../../mock/types';
import { useStore, useT } from '../../state/store';
import { formatDate, formatTime } from '../../utils/format';
import { useAgo, useMockLoad } from '../../utils/hooks';
import { useEntrance } from '../../utils/motion';

const STATUS_ORDER: BedStatus[] = ['occupied', 'ready', 'cleaning', 'reserved', 'oos'];
const TIERS: AlertTier[] = ['critical', 'high', 'normal'];

/** Bar segment colour per bed status (decorative; the chips under it carry the words). */
const BAR: Record<BedStatus, string> = {
  occupied: 'bg-primary-600',
  ready: 'bg-success-text',
  cleaning: 'bg-warning-text',
  reserved: 'bg-primary-100',
  oos: 'bg-border-input',
};

const TIER_TONE: Record<AlertTier, Tone> = { critical: 'danger', high: 'warning', normal: 'neutral' };
const TIER_ICON: Record<AlertTier, string> = { critical: 'text-danger-text', high: 'text-warning-text', normal: 'text-ink-700' };

function OverviewSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="grid grid-cols-12 gap-6">
      {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="col-span-3 h-[124px]" />)}
      <Skeleton className="col-span-12 h-[400px] 2xl:col-span-8" />
      <Skeleton className="col-span-5 h-[400px] 2xl:col-span-4" />
      <Skeleton className="col-span-7 h-[320px] 2xl:col-span-12 2xl:h-[200px]" />
    </div>
  );
}

function CardLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="inline-flex h-10 items-center gap-1 whitespace-nowrap text-sm font-semibold text-primary-600 hover:underline">
      {children} <ArrowRight size={16} aria-hidden />
    </Link>
  );
}

function BedMap() {
  const { beds } = useStore();
  const t = useT();
  const count = (s: BedStatus) => beds.filter((b) => b.status === s).length;
  const present = STATUS_ORDER.filter((s) => count(s) > 0);

  return (
    <Card title={t('bedmap.title')} className="col-span-12 2xl:col-span-8" action={<CardLink to="/beds">{t('bedmap.open')}</CardLink>}>
      <div className="px-4 pt-4">
        {/* Ward mix at a glance. */}
        <div aria-hidden className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-neutral-bg">
          {present.map((s) => <span key={s} className={BAR[s]} style={{ flex: count(s) }} />)}
        </div>
        <ul className="mt-3 flex flex-wrap gap-2">
          {present.map((s) => (
            <li key={s}>
              <Link to={`/beds?status=${s}`} className="rounded-full hover:opacity-80" aria-label={`${t(`bed.${s}`)} ${count(s)}`}>
                <Chip tone={BED_STATUS[s].tone} icon={BED_STATUS[s].icon}>
                  {t(`bed.${s}`)} <span className="tabular-nums">{count(s)}</span>
                </Chip>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <ul data-bed-grid className="grid grid-cols-5 gap-3 p-4">
        {beds.map((b) => <li key={b.id}><BedTile bed={b} /></li>)}
      </ul>
    </Card>
  );
}

function LiveAlerts() {
  const { alerts, openAlerts, dispatch } = useStore();
  const t = useT();
  const ago = useAgo();
  const [tier, setTier] = useState<AlertTier | 'all'>('all');
  const open = alerts.filter((a) => !a.acknowledged);
  const tiers = TIERS.filter((x) => open.some((a) => a.tier === x));
  const shown = (tier === 'all' ? open : open.filter((a) => a.tier === tier)).slice(0, 6);

  const tab = (id: AlertTier | 'all', label: string, n: number) => (
    <button
      key={id}
      type="button"
      aria-pressed={tier === id}
      onClick={() => setTier(id)}
      className={`h-8 rounded-full border px-3 text-sm font-semibold transition-colors duration-150 ease-out ${
        tier === id ? 'border-primary-100 bg-primary-50 text-primary-700' : 'border-border-subtle bg-surface text-ink-700 hover:bg-page'
      }`}
    >
      {label} <span className="tabular-nums">{n}</span>
    </button>
  );

  return (
    <Card
      title={t('liveFeed.title')}
      className="no-motion col-span-5 flex flex-col 2xl:col-span-4"
      action={
        <button type="button" onClick={() => dispatch({ type: 'alerts-open', open: true })} className="h-10 whitespace-nowrap text-sm font-semibold text-primary-600 hover:underline">
          {t('liveFeed.viewAll', { n: openAlerts })}
        </button>
      }
    >
      {open.length === 0 ? (
        <p className="p-6 text-center text-ink-700">{t('alerts.none')}</p>
      ) : (
        <>
          <div role="group" aria-label={t('liveFeed.filter')} className="flex flex-wrap gap-2 border-b border-border-subtle px-4 py-3">
            {tab('all', t('liveFeed.all'), open.length)}
            {tiers.map((x) => tab(x, t(`alerts.${x}`), open.filter((a) => a.tier === x).length))}
          </div>
          {/* Four rows below 1920 px, six on wide screens; "View all" opens the rest. */}
          <ul aria-live="polite" className="divide-y divide-border-subtle [&>li:nth-child(n+5)]:hidden 2xl:[&>li:nth-child(n+5)]:flex">
            {shown.map((a) => {
              const Icon = KIND_ICON[a.kind];
              return (
                <li key={a.id} className="flex gap-3 px-4 py-3">
                  <Icon size={20} strokeWidth={1.75} aria-hidden className={`mt-1 shrink-0 ${TIER_ICON[a.tier]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{t(a.title.key, a.title.vars)}</p>
                    <p className="text-sm text-ink-700">{t(a.detail.key, a.detail.vars)}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-500 tabular-nums">
                      <Chip tone={TIER_TONE[a.tier]} icon={Icon}>{t(`alerts.${a.tier}`)}</Chip>
                      {formatTime(a.at)} · {ago(a.at)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Card>
  );
}

function StaffOnDuty() {
  const { beds, alerts, staff } = useStore();
  const t = useT();
  const occupied = new Set(beds.filter((b) => b.status === 'occupied').map((b) => b.id));
  // Overdue doses come from the live alerts, so they change as events arrive.
  const overdueBeds = alerts.filter((a) => a.kind === 'overdue' && !a.acknowledged).map((a) => a.bedId);
  const max = SHIFT_RULE.patientsPerNurse;

  return (
    <Card title={t('staff.title')} className="col-span-7 2xl:col-span-12" action={<CardLink to="/staff">{t('staff.open')}</CardLink>}>
      <ul className="grid grid-cols-2 gap-3 p-4 2xl:grid-cols-4">
        {staff.map((s) => {
          const patients = s.beds.filter((b) => occupied.has(b)).length;
          const overdue = overdueBeds.filter((b) => b !== undefined && s.beds.includes(b)).length;
          const overRatio = s.role === 'nurse' && patients > max;
          const initials = s.name.replace(/^(Nurse|Sister|Dr\.)\s+/, '').split(' ').map((w) => w[0]).join('').slice(0, 2);
          return (
            <li key={s.id} className={`flex flex-col gap-2 rounded-card border p-3 ${overRatio ? 'border-warning-border' : 'border-border-subtle'}`}>
              <div className="flex items-center gap-3">
                <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-bg text-sm font-semibold text-neutral-text">
                  {initials}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-sm text-ink-700">{t(`staffRole.${s.role}`)}</p>
                </div>
              </div>
              <p className="text-sm text-ink-700 tabular-nums">{s.beds.length ? t('staff.beds', { list: s.beds.join(', ') }) : t('staff.noBeds')}</p>
              {s.beds.length > 0 && (
                <div>
                  <p className="text-sm text-ink-700 tabular-nums">{t('staff.load', { n: patients, max })}</p>
                  {/* Workload against the ratio rule: grey up to the limit, amber at the limit and red beyond it. */}
                  <div aria-hidden className="mt-1 flex h-2 gap-0.5 overflow-hidden rounded-full bg-neutral-bg">
                    <span className={overRatio ? 'bg-warning-text' : 'bg-border-input'} style={{ flex: Math.min(patients, max) }} />
                    {overRatio && <span className="bg-danger-text" style={{ flex: patients - max }} />}
                    {!overRatio && <span style={{ flex: max - patients }} />}
                  </div>
                </div>
              )}
              <div className="mt-auto flex flex-wrap gap-2">
                {overRatio && <Chip tone="warning" icon={TriangleAlert}>{t('staff.overRatio', { n: patients, max })}</Chip>}
                {overdue > 0
                  ? <Chip tone="danger" icon={Clock}>{t('staff.overdue', { n: overdue })}</Chip>
                  : <Chip tone="success" icon={BED_STATUS.ready.icon}>{t('staff.noneOverdue')}</Chip>}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function Overview() {
  const { beds, alerts, openAlerts, ward, dispatch } = useStore();
  const t = useT();
  const { loading, error, retry } = useMockLoad();
  const grid = useRef<HTMLDivElement>(null);
  // Stat tiles, cards and bed tiles rise in once the data has loaded (not on live updates).
  // The live alert feed is left out: alerts must appear instantly.
  useEntrance(grid, ':scope > :not(.no-motion), [data-bed-grid] > li', !loading && !error);

  const count = (s: BedStatus) => beds.filter((b) => b.status === s).length;
  const open = alerts.filter((a) => !a.acknowledged);
  const tier = (x: string) => open.filter((a) => a.tier === x).length;
  const role = (r: string) => STAFF.filter((s) => s.role === r).length;
  // Only the tiers that have alerts, e.g. "2 high · 1 normal".
  const alertsTrend = TIERS
    .filter((x) => tier(x) > 0)
    .map((x) => t('stat.tierCount', { n: tier(x), tier: t(`alerts.${x}`).toLowerCase() }))
    .join(' · ') || t('alerts.none');

  return (
    <>
      <PageHeader
        title={t('screen.D3.title')}
        subtitle={<span className="tabular-nums">{ward.name} · {formatDate(new Date().toISOString())}</span>}
      />

      {loading ? <OverviewSkeleton /> : error ? <Card><ErrorState onRetry={retry} /></Card> : (
        <div ref={grid} className="grid grid-cols-12 items-start gap-6 2xl:items-stretch">
          <div className="col-span-3 self-stretch">
            <StatTile label={t('stat.free')} value={count('ready') + count('cleaning')} icon={BedDouble} to="/beds?status=ready" trend={t('stat.freeTrend', { ready: count('ready'), cleaning: count('cleaning') })} />
          </div>
          <div className="col-span-3 self-stretch">
            <StatTile label={t('stat.alerts')} value={openAlerts} icon={Bell} tone={openAlerts > 0 ? 'danger' : 'neutral'} onClick={() => dispatch({ type: 'alerts-open', open: true })} trend={alertsTrend} />
          </div>
          <div className="col-span-3 self-stretch">
            <StatTile label={t('stat.doses')} value={`${DOSES_TODAY.onTimePct}%`} icon={Clock} to="/reports/doses" trend={t('stat.dosesTrend', { before: DOSES_TODAY.beforePct })} />
          </div>
          <div className="col-span-3 self-stretch">
            <StatTile label={t('stat.staff')} value={STAFF.length} icon={Users} to="/staff" trend={t('stat.staffTrend', { nurses: role('nurse'), senior: role('senior'), doctors: role('doctor') })} />
          </div>

          <BedMap />
          <LiveAlerts />
          <StaffOnDuty />
        </div>
      )}
    </>
  );
}
