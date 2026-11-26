// D8 Waiting queue: ranked table, urgency request flag, "Why here?" score breakdown, override with a reason.
import { ArrowUp, BedDouble, ChevronDown, ChevronUp, Hand, Plus, ShieldCheck } from 'lucide-react';
import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chip, PriorityBadge } from '../../components/Chips';
import { Card, PageHeader } from '../../components/PageHeader';
import { ReasonDialog } from '../../components/ReasonDialog';
import { EmptyState, ErrorState, TableSkeleton } from '../../components/States';
import { pointsToMoveAbove, rankQueue, type Ranked } from '../../mock/queue';
import { useStore, useT } from '../../state/store';
import { formatDate, formatTime } from '../../utils/format';
import { useMockLoad, useNow } from '../../utils/hooks';

/** "8:10 AM" for today, otherwise "25 Nov 2026". */
const booked = (iso: string) =>
  new Date(iso).toDateString() === new Date().toDateString() ? formatTime(iso) : formatDate(iso);

export function WhyHere({ r }: { r: Ranked }) {
  const t = useT();
  const s = r.score;
  return (
    <div className="space-y-2 text-sm">
      <p className="tabular-nums">
        {t('queue.why.priority', { n: s.priority, p: r.entry.priority })}
        {' + '}{t('queue.why.wait', { n: s.wait, h: s.hours })}
        {' + '}{t('queue.why.booking', { n: s.booking })}
        {s.override > 0 && <>{' + '}{t('queue.why.override', { n: s.override })}</>}
        {' = '}<strong>{s.total}</strong>
      </p>
      {r.entry.override && (
        <p className="flex items-start gap-2 text-ink-700">
          <ShieldCheck size={16} aria-hidden className="mt-1 shrink-0 text-primary-600" />
          {t('queue.why.overrideBy', { by: r.entry.override.by, reason: r.entry.override.reason })}
        </p>
      )}
      {r.entry.urgencyRequest && <p className="text-ink-700">{t('queue.why.request')}</p>}
    </div>
  );
}

export function Queue() {
  const { queue, beds, serverDown, user, dispatch, logAudit, toast } = useStore();
  const readyBeds = beds.filter((b) => b.status === 'ready');
  const t = useT();
  const now = useNow();
  const { loading, error, retry } = useMockLoad();
  const [open, setOpen] = useState<string | null>(null);
  const [moving, setMoving] = useState<{ mover: Ranked; target: Ranked } | null>(null);

  const ranked = rankQueue(queue, now);
  const openRequests = queue.filter((q) => q.urgencyRequest?.status === 'open').length;

  const confirmMove = (reason: string) => {
    if (!moving) return;
    const { mover, target } = moving;
    const points = pointsToMoveAbove(mover, target);
    dispatch({ type: 'queue-override', id: mover.entry.id, points, reason, by: user.name });
    logAudit(`Queue override: ${mover.entry.name} above ${target.entry.name} (+${points})`, reason);
    toast(t('queue.movedToast', { name: mover.entry.name }));
    setMoving(null);
    setOpen(mover.entry.id);
  };

  return (
    <>
      <PageHeader
        title={t('screen.D8.title')}
        subtitle={t('queue.subtitle', { n: queue.length })}
        actions={
          <>
            <Link to="/queue/requests" className="btn-secondary">
              <Hand size={16} aria-hidden /> {t('screen.D10.title')}
              {openRequests > 0 && <span className="rounded-full bg-warning-text px-2 text-sm text-surface tabular-nums">{openRequests}</span>}
            </Link>
            <Link to="/queue/add" className="btn-primary"><Plus size={16} aria-hidden /> {t('screen.D9.title')}</Link>
          </>
        }
      />

      {/* Freed beds waiting for a patient: the desk assigns from here (it has no bed screens). */}
      {readyBeds.length > 0 && (
        <div role="status" className="mb-6 flex flex-wrap items-center gap-3 rounded-card border border-success-border bg-success-bg p-4">
          <BedDouble size={20} aria-hidden className="text-success-text" />
          <span className="font-semibold text-success-text">{t('queue.readyBeds', { n: readyBeds.length })}</span>
          {readyBeds.map((b) => (
            <Link key={b.id} to={`/queue/assign/${b.id}`} className="btn-secondary">{t('queue.assignBed', { bed: b.id })}</Link>
          ))}
        </div>
      )}

      <Card>
        {loading ? <TableSkeleton /> : error ? <ErrorState onRetry={retry} /> : ranked.length === 0 ? (
          <EmptyState title={t('queue.empty')} action={<Link to="/queue/add" className="btn-secondary">{t('screen.D9.title')}</Link>} />
        ) : (
          <table className="w-full border-collapse whitespace-nowrap text-sm">
            <caption className="sr-only">{t('screen.D8.title')}</caption>
            <thead className="sticky top-0 bg-surface shadow-bar">
              <tr className="h-12 text-left text-ink-700">
                <th scope="col" className="px-4 font-semibold">#</th>
                <th scope="col" className="px-4 font-semibold">{t('queue.col.patient')}</th>
                <th scope="col" className="px-4 font-semibold">{t('queue.col.priority')}</th>
                <th scope="col" className="px-4 text-right font-semibold">{t('queue.col.wait')}</th>
                <th scope="col" className="px-4 font-semibold">{t('queue.col.booked')}</th>
                <th scope="col" className="px-4 font-semibold">{t('queue.col.bed')}</th>
                <th scope="col" className="px-4 text-right font-semibold">{t('queue.col.score')}</th>
                <th scope="col" className="px-4 text-right font-semibold"><span className="sr-only">{t('beds.col.action')}</span></th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r, i) => {
                const expanded = open === r.entry.id;
                const above = ranked[i - 1];
                return (
                  <Fragment key={r.entry.id}>
                    <tr className="border-t border-border-subtle hover:bg-primary-50 [&>td]:py-2">
                      <td className="px-4 text-lg font-semibold tabular-nums">{r.rank}</td>
                      <td className="px-4">
                        <span className="font-semibold">{r.entry.name}</span>
                        <span className="block text-ink-500">{t(`source.${r.entry.source}`)}</span>
                        {r.entry.urgencyRequest?.status === 'open' && (
                          <Link to="/queue/requests" aria-label={t('queue.requestFlagLabel', { name: r.entry.name })} className="mt-1 inline-block">
                            <Chip tone="warning" icon={Hand}>{t('queue.requestFlag')}</Chip>
                          </Link>
                        )}
                      </td>
                      <td className="px-4"><PriorityBadge priority={r.entry.priority} /></td>
                      <td className="px-4 text-right tabular-nums">{t('time.h', { n: r.score.hours })}</td>
                      <td className="px-4 tabular-nums">{booked(r.entry.bookedAt)}</td>
                      <td className="px-4">{t(`bedType.${r.entry.bedType}`)}</td>
                      <td className="px-4 text-right">
                        <button
                          type="button"
                          aria-expanded={expanded}
                          aria-controls={`why-${r.entry.id}`}
                          onClick={() => setOpen(expanded ? null : r.entry.id)}
                          className="inline-flex h-10 items-center gap-1 rounded-control px-2 font-semibold text-primary-600 hover:bg-primary-50"
                        >
                          <span className="tabular-nums">{r.score.total}</span>
                          <span className="text-ink-500" aria-hidden>·</span> {t('queue.why')}
                          {expanded ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
                        </button>
                      </td>
                      <td className="px-4">
                        <div className="flex items-center justify-end gap-2">
                          {above && (
                            <button
                              type="button"
                              disabled={serverDown}
                              title={serverDown ? t('common.paused') : undefined}
                              onClick={() => setMoving({ mover: r, target: above })}
                              aria-label={t('queue.moveUpLabel', { name: r.entry.name, other: above.entry.name })}
                              className="btn-secondary h-10 px-3"
                            >
                              <ArrowUp size={16} aria-hidden /> {t('queue.moveUp')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expanded && (
                      <tr id={`why-${r.entry.id}`} className="bg-primary-50">
                        <td />
                        <td colSpan={7} className="px-4 py-3"><WhyHere r={r} /></td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <p className="mt-4 text-sm text-ink-500">{t('queue.rule')}</p>

      <ReasonDialog
        open={!!moving}
        title={moving ? t('queue.moveTitle', { name: moving.mover.entry.name, other: moving.target.entry.name }) : ''}
        body={moving ? t('queue.moveBody', { name: moving.mover.entry.name, other: moving.target.entry.name }) : ''}
        actionLabel={t('queue.moveUp')}
        onCancel={() => setMoving(null)}
        onConfirm={confirmMove}
      />
    </>
  );
}
