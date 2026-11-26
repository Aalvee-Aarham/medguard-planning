// D15 Swap requests: approve or decline nurses' shift swaps. Declining needs a reason the nurse sees.
// Approving a swap that would break a rule also needs a reason, and the warning is shown first.
import { ArrowLeftRight, CircleCheck, TriangleAlert, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Chip } from '../../components/Chips';
import { Card, PageHeader } from '../../components/PageHeader';
import { ReasonDialog } from '../../components/ReasonDialog';
import { EmptyState, ErrorState, TableSkeleton } from '../../components/States';
import { applySwap, checkPlan, dayDate, rosterName } from '../../mock/shifts';
import type { SwapRequest } from '../../mock/types';
import { useStore, useT } from '../../state/store';
import { useAgo, useMockLoad } from '../../utils/hooks';
import { useWarningText } from './ShiftPlanner';

const day = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

export function SwapRequests() {
  const { swaps, shiftPlan: plan, beds, serverDown, user, dispatch, logAudit, toast } = useStore();
  const t = useT();
  const ago = useAgo();
  const warnText = useWarningText();
  const { loading, error, retry } = useMockLoad();
  const [action, setAction] = useState<{ req: SwapRequest; approve: boolean } | null>(null);

  const patients = beds.filter((b) => b.status === 'occupied').length;
  const now = plan ? checkPlan(plan.cells, patients).length : 0;
  /** Warnings the swap would add to the plan. */
  const newWarnings = (req: SwapRequest) => {
    if (!plan) return [];
    const after = checkPlan(applySwap(plan.cells, req), patients);
    return after.length > now ? after : [];
  };

  const answer = (req: SwapRequest, approve: boolean, text: string) => {
    dispatch({ type: 'swap-answer', id: req.id, approve, answer: text, by: user.name });
    logAudit(`${approve ? 'Approved' : 'Declined'} swap: ${rosterName(req.fromId)} ↔ ${rosterName(req.toId)}, ${day(dayDate(plan?.weekStart ?? new Date().toISOString(), req.day))}`, text);
    toast(t(approve ? 'swaps.approvedToast' : 'swaps.declinedToast', { from: rosterName(req.fromId), to: rosterName(req.toId) }));
    setAction(null);
  };

  const approve = (req: SwapRequest) => (newWarnings(req).length ? setAction({ req, approve: true }) : answer(req, true, ''));
  const open = swaps.filter((s) => s.status === 'open');
  const done = swaps.filter((s) => s.status !== 'open');

  const card = (req: SwapRequest) => {
    const date = plan ? day(dayDate(plan.weekStart, req.day)) : null;
    const fromShift = plan?.cells[req.fromId][req.day];
    const toShift = plan?.cells[req.toId][req.day];
    const adds = req.status === 'open' ? newWarnings(req) : [];
    return (
      <li key={req.id} className="rounded-card border border-border-subtle bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="flex flex-wrap items-center gap-2 text-lg font-semibold">
            {rosterName(req.fromId)} <ArrowLeftRight size={18} aria-label={t('swaps.with')} className="text-ink-500" /> {rosterName(req.toId)}
          </p>
          {req.status === 'open' ? <Chip tone="warning" icon={ArrowLeftRight}>{t('swaps.status.open')}</Chip>
            : req.status === 'approved' ? <Chip tone="success" icon={CircleCheck}>{t('swaps.status.approved')}</Chip>
            : <Chip tone="neutral" icon={XCircle}>{t('swaps.status.declined')}</Chip>}
        </div>
        {plan && date && fromShift && toShift && (
          <p className="mt-1 text-sm text-ink-700 tabular-nums">
            {req.status === 'approved'
              ? t('swaps.doneDetail', { date })
              : t('swaps.detail', { date, from: rosterName(req.fromId), fromShift: t(`shift.${fromShift}`), to: rosterName(req.toId), toShift: t(`shift.${toShift}`) })}
          </p>
        )}
        <p className="mt-2">“{req.reason}”</p>
        <p className="text-xs text-ink-500">{t('swaps.asked', { ago: ago(req.at) })}</p>

        {adds.length > 0 && (
          <div className="mt-3 rounded-control border border-danger-border bg-danger-bg p-3 text-sm">
            <p className="flex items-center gap-2 font-semibold text-danger-text"><TriangleAlert size={16} aria-hidden /> {t('swaps.breaks')}</p>
            <ul className="mt-1 list-disc pl-6">{adds.map((w, i) => <li key={i}>{warnText(w, plan!.weekStart)}</li>)}</ul>
          </div>
        )}

        {req.status === 'open' ? (
          <div className="mt-4 flex gap-2">
            <button type="button" disabled={!plan || serverDown} title={!plan ? t('swaps.needPlan') : serverDown ? t('common.paused') : undefined} onClick={() => approve(req)} className="btn-primary">
              {t('swaps.approve')}
            </button>
            <button type="button" disabled={serverDown} onClick={() => setAction({ req, approve: false })} className="btn-secondary">{t('swaps.decline')}</button>
          </div>
        ) : req.answer ? (
          <div className="mt-3 rounded-control bg-page p-3 text-sm">
            <p className="font-semibold text-ink-700">{t('swaps.answerBy', { by: req.by ?? '' })}</p>
            <p>“{req.answer}”</p>
          </div>
        ) : null}
      </li>
    );
  };

  return (
    <>
      <PageHeader title={t('screen.D15.title')} subtitle={t('swaps.subtitle')} back={{ to: '/shifts', label: t('screen.D14.title') }} />
      {!plan && (
        <p role="status" className="mb-6 max-w-3xl rounded-card border border-warning-border bg-warning-bg p-4 text-warning-text">
          <span className="font-semibold">{t('swaps.needPlan')}</span> <Link to="/shifts" className="underline">{t('screen.D14.title')}</Link>
        </p>
      )}
      {loading ? <Card><TableSkeleton rows={3} /></Card> : error ? <Card><ErrorState onRetry={retry} /></Card> : (
        <div className="max-w-3xl space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-semibold">{t('swaps.open', { n: open.length })}</h2>
            {open.length ? <ul className="space-y-4">{open.map(card)}</ul> : <Card><EmptyState title={t('swaps.none')} /></Card>}
          </section>
          {done.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">{t('swaps.done', { n: done.length })}</h2>
              <ul className="space-y-4">{done.map(card)}</ul>
            </section>
          )}
        </div>
      )}

      <ReasonDialog
        open={!!action}
        title={action ? t(action.approve ? 'swaps.approveTitle' : 'swaps.declineTitle', { from: rosterName(action.req.fromId), to: rosterName(action.req.toId) }) : ''}
        body={action ? t(action.approve ? 'swaps.approveBody' : 'swaps.declineBody', { from: rosterName(action.req.fromId) }) : ''}
        reasonLabel={t(action?.approve ? 'dialog.reason' : 'swaps.answerLabel')}
        reasonHelp={action?.approve ? undefined : t('swaps.answerHelp')}
        actionLabel={action ? t(action.approve ? 'swaps.approve' : 'swaps.decline') : ''}
        onCancel={() => setAction(null)}
        onConfirm={(text) => action && answer(action.req, action.approve, text)}
      />
    </>
  );
}
