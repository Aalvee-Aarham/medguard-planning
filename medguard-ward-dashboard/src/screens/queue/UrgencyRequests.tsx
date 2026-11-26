// D10 Urgency requests: patients ask from their Health Profile app; raise priority or decline.
// Both need an answer, and the patient sees it.
import { CircleCheck, Hand, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Chip, PriorityBadge } from '../../components/Chips';
import { Card, PageHeader } from '../../components/PageHeader';
import { ReasonDialog } from '../../components/ReasonDialog';
import { EmptyState, ErrorState, TableSkeleton } from '../../components/States';
import { hoursWaiting, raise } from '../../mock/queue';
import type { QueueEntry } from '../../mock/types';
import { useStore, useT } from '../../state/store';
import { formatTime } from '../../utils/format';
import { useAgo, useMockLoad, useNow } from '../../utils/hooks';

export function UrgencyRequests() {
  const { queue, serverDown, user, dispatch, logAudit, toast } = useStore();
  const t = useT();
  const now = useNow();
  const ago = useAgo();
  const { loading, error, retry } = useMockLoad();
  const [action, setAction] = useState<{ entry: QueueEntry; raise: boolean } | null>(null);

  const withRequests = queue.filter((q) => q.urgencyRequest);
  const open = withRequests.filter((q) => q.urgencyRequest!.status === 'open');
  const answered = withRequests.filter((q) => q.urgencyRequest!.status !== 'open');

  const confirm = (answer: string) => {
    if (!action) return;
    const { entry } = action;
    dispatch({ type: 'request-answer', id: entry.id, raise: action.raise, answer, by: user.name });
    logAudit(action.raise ? `Raised ${entry.name} from ${entry.priority} to ${raise(entry.priority)}` : `Declined urgency request from ${entry.name}`, answer);
    toast(t(action.raise ? 'req.raisedToast' : 'req.declinedToast', { name: entry.name }));
    setAction(null);
  };

  const paused = serverDown ? t('common.paused') : undefined;

  const card = (q: QueueEntry) => {
    const r = q.urgencyRequest!;
    const isOpen = r.status === 'open';
    return (
      <li key={q.id} className="rounded-card border border-border-subtle bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold">{q.name}</p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-700 tabular-nums">
              <PriorityBadge priority={q.priority} />
              {t('req.waiting', { h: hoursWaiting(q, now) })} · {t('req.asked', { time: formatTime(r.at), ago: ago(r.at) })}
            </p>
          </div>
          {isOpen ? (
            <Chip tone="warning" icon={Hand}>{t('req.status.open')}</Chip>
          ) : r.status === 'raised' ? (
            <Chip tone="success" icon={CircleCheck}>{t('req.status.raised')}</Chip>
          ) : (
            <Chip tone="neutral" icon={XCircle}>{t('req.status.declined')}</Chip>
          )}
        </div>

        <blockquote className="mt-3 border-l-4 border-primary-100 pl-3">
          <p className="text-sm font-semibold text-ink-700">{t('req.patientSays')}</p>
          <p>“{r.reason}”</p>
        </blockquote>

        {isOpen ? (
          <div className="mt-4 flex gap-2">
            <button type="button" disabled={!!paused || q.priority === 'P1'} title={q.priority === 'P1' ? t('req.alreadyTop') : paused} onClick={() => setAction({ entry: q, raise: true })} className="btn-primary">
              {t('req.raise', { to: q.priority === 'P1' ? 'P1' : raise(q.priority) })}
            </button>
            <button type="button" disabled={!!paused} title={paused} onClick={() => setAction({ entry: q, raise: false })} className="btn-secondary">
              {t('req.decline')}
            </button>
          </div>
        ) : (
          <div className="mt-3 rounded-control bg-page p-3 text-sm">
            <p className="font-semibold text-ink-700">{t('req.answerSent', { by: r.answeredBy ?? '' })}</p>
            <p>“{r.answer}”</p>
          </div>
        )}
      </li>
    );
  };

  return (
    <>
      <PageHeader title={t('screen.D10.title')} subtitle={t('req.subtitle')} back={{ to: '/queue', label: t('screen.D8.title') }} />
      {loading ? <Card><TableSkeleton rows={3} /></Card> : error ? <Card><ErrorState onRetry={retry} /></Card> : (
        <div className="max-w-3xl space-y-8">
          <section>
            <h2 className="mb-3 text-lg font-semibold">{t('req.open', { n: open.length })}</h2>
            {open.length ? <ul className="space-y-4">{open.map(card)}</ul> : (
              <Card><EmptyState title={t('req.none')} body={t('req.noneBody')} /></Card>
            )}
          </section>
          {answered.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">{t('req.answered', { n: answered.length })}</h2>
              <ul className="space-y-4">{answered.map(card)}</ul>
            </section>
          )}
        </div>
      )}

      <ReasonDialog
        open={!!action}
        title={action ? t(action.raise ? 'req.raiseTitle' : 'req.declineTitle', { name: action.entry.name, to: raise(action.entry.priority) }) : ''}
        body={action ? t(action.raise ? 'req.raiseBody' : 'req.declineBody', { name: action.entry.name }) : ''}
        reasonLabel={t('req.answerLabel')}
        reasonHelp={t('req.answerHelp')}
        actionLabel={action ? t(action.raise ? 'req.raiseShort' : 'req.decline') : ''}
        onCancel={() => setAction(null)}
        onConfirm={confirm}
      />
    </>
  );
}
