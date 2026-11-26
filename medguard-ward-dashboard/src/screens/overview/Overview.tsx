// D3 Overview: stat tiles · bed map by status · live alert feed · staff on duty. Updates live from mock events.
import { BedDouble, Bell, Clock, TriangleAlert, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { KIND_ICON, TIER_STYLE } from '../../app/AlertsPanel';
import { BedTile } from '../../components/BedTile';
import { BED_STATUS, Chip } from '../../components/Chips';
import { Card, PageHeader } from '../../components/PageHeader';
import { StatTile } from '../../components/StatTile';
import { ErrorState, Skeleton } from '../../components/States';
import { DOSES_TODAY, SHIFT_RULE, STAFF } from '../../mock/data';
import type { BedStatus } from '../../mock/types';
import { useStore, useT } from '../../state/store';
import { formatDate, formatTime } from '../../utils/format';
import { useAgo, useMockLoad } from '../../utils/hooks';

const STATUS_ORDER: BedStatus[] = ['occupied', 'ready', 'cleaning', 'reserved', 'oos'];

function OverviewSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="grid grid-cols-12 gap-6">
      {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="col-span-3 h-[124px]" />)}
      <Skeleton className="col-span-12 h-[360px] 2xl:col-span-8" />
      <Skeleton className="col-span-5 h-[400px] 2xl:col-span-4 2xl:row-span-2 2xl:h-[600px]" />
      <Skeleton className="col-span-7 h-[216px] 2xl:col-span-8" />
    </div>
  );
}

function LiveAlerts() {
  const { alerts, openAlerts, dispatch } = useStore();
  const t = useT();
  const ago = useAgo();
  const latest = alerts.filter((a) => !a.acknowledged).slice(0, 6);

  return (
    <Card
      title={t('liveFeed.title')}
      className="col-span-5 flex flex-col 2xl:col-span-4 2xl:row-span-2"
      action={
        <button type="button" onClick={() => dispatch({ type: 'alerts-open', open: true })} className="h-10 text-sm font-semibold text-primary-600 hover:underline">
          {t('liveFeed.viewAll', { n: openAlerts })}
        </button>
      }
    >
      {latest.length === 0 ? (
        <p className="p-6 text-center text-ink-700">{t('alerts.none')}</p>
      ) : (
        <ul aria-live="polite" className="space-y-2 p-4">
          {latest.map((a) => {
            const Icon = KIND_ICON[a.kind];
            return (
              <li key={a.id} className={`flex gap-3 rounded-card border p-3 ${TIER_STYLE[a.tier]}`}>
                <Icon size={20} strokeWidth={1.75} aria-hidden className="mt-1 shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold">{t(a.title.key, a.title.vars)}</p>
                  <p className="text-sm text-ink-700">{t(a.detail.key, a.detail.vars)}</p>
                  <p className="text-xs text-ink-500 tabular-nums">{formatTime(a.at)} · {ago(a.at)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function StaffOnDuty() {
  const { beds, alerts } = useStore();
  const t = useT();
  const occupied = new Set(beds.filter((b) => b.status === 'occupied').map((b) => b.id));
  // Overdue doses come from the live alerts, so they change as events arrive.
  const overdueBeds = alerts.filter((a) => a.kind === 'overdue' && !a.acknowledged).map((a) => a.bedId);

  return (
    <Card title={t('staff.title')} className="col-span-7 2xl:col-span-8" action={<Link to="/staff" className="text-sm font-semibold text-primary-600 hover:underline">{t('staff.open')}</Link>}>
      <ul className="divide-y divide-border-subtle">
        {STAFF.map((s) => {
          const patients = s.beds.filter((b) => occupied.has(b)).length;
          const overdue = overdueBeds.filter((b) => b !== undefined && s.beds.includes(b)).length;
          const overRatio = s.role === 'nurse' && patients > SHIFT_RULE.patientsPerNurse;
          return (
            <li key={s.id} className="grid grid-cols-12 items-center gap-4 px-4 py-3">
              <div className="col-span-4">
                <p className="font-semibold">{s.name}</p>
                <p className="text-sm text-ink-700">{t(`staffRole.${s.role}`)}</p>
              </div>
              <p className="col-span-4 text-sm text-ink-700 tabular-nums">
                {s.beds.length ? `${t('staff.beds', { list: s.beds.join(', ') })} · ${t('staff.patients', { n: patients })}` : t('staff.noBeds')}
              </p>
              <div className="col-span-4 flex flex-wrap justify-end gap-2">
                {overRatio && <Chip tone="warning" icon={TriangleAlert}>{t('staff.overRatio', { n: patients, max: SHIFT_RULE.patientsPerNurse })}</Chip>}
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
  const { beds, alerts, openAlerts, ward } = useStore();
  const t = useT();
  const { loading, error, retry } = useMockLoad();

  const count = (s: BedStatus) => beds.filter((b) => b.status === s).length;
  const open = alerts.filter((a) => !a.acknowledged);
  const tier = (x: string) => open.filter((a) => a.tier === x).length;
  const role = (r: string) => STAFF.filter((s) => s.role === r).length;
  // Only the tiers that have alerts, e.g. "2 high · 1 normal".
  const alertsTrend = (['critical', 'high', 'normal'] as const)
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
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3">
            <StatTile label={t('stat.free')} value={count('ready') + count('cleaning')} icon={BedDouble} trend={t('stat.freeTrend', { ready: count('ready'), cleaning: count('cleaning') })} />
          </div>
          <div className="col-span-3">
            <StatTile label={t('stat.alerts')} value={openAlerts} icon={Bell} trend={alertsTrend} />
          </div>
          <div className="col-span-3">
            <StatTile label={t('stat.doses')} value={`${DOSES_TODAY.onTimePct}%`} icon={Clock} trend={t('stat.dosesTrend', { before: DOSES_TODAY.beforePct })} />
          </div>
          <div className="col-span-3">
            <StatTile label={t('stat.staff')} value={STAFF.length} icon={Users} trend={t('stat.staffTrend', { nurses: role('nurse'), senior: role('senior'), doctors: role('doctor') })} />
          </div>

          <Card
            title={t('bedmap.title')}
            className="col-span-12 2xl:col-span-8"
            action={
              <ul className="flex flex-wrap gap-x-4 text-sm text-ink-700 tabular-nums">
                {STATUS_ORDER.filter((s) => count(s) > 0).map((s) => (
                  <li key={s}>
                    <Link to={`/beds?status=${s}`} className="hover:text-primary-600 hover:underline">{t(`bed.${s}`)} {count(s)}</Link>
                  </li>
                ))}
              </ul>
            }
          >
            <ul className="grid grid-cols-5 gap-3 p-4">
              {beds.map((b) => <li key={b.id}><BedTile bed={b} /></li>)}
            </ul>
          </Card>

          <LiveAlerts />
          <StaffOnDuty />
        </div>
      )}
    </>
  );
}
