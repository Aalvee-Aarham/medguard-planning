// D11 Assign bed: a freed bed is matched to the top patient. Confirm, or pick another with a reason.
// The patient and the admission desk are notified.
import { BedDouble, CircleCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BedStatusChip, PriorityBadge } from '../../components/Chips';
import { Card, PageHeader } from '../../components/PageHeader';
import { ReasonDialog } from '../../components/ReasonDialog';
import { EmptyState, ErrorState, Skeleton } from '../../components/States';
import { rankQueue, type Ranked } from '../../mock/queue';
import { useStore, useT } from '../../state/store';
import { useMockLoad, useNow } from '../../utils/hooks';
import { WhyHere } from './Queue';

// Every bed in Neuro Ward B is a general bed; ICU patients wait for an ICU bed elsewhere.
const WARD_BED_TYPE = 'General';

export function AssignBed() {
  const { beds, queue, serverDown, user, role, dispatch, logAudit, toast } = useStore();
  const t = useT();
  const now = useNow();
  const navigate = useNavigate();
  const { bedId } = useParams();
  const { loading, error, retry } = useMockLoad();
  const [other, setOther] = useState<string>('');
  const [picking, setPicking] = useState(false);

  const back = { to: '/queue', label: t('screen.D8.title') };
  const bed = beds.find((b) => String(b.id) === bedId);
  const ranked = rankQueue(queue, now);
  const eligible = ranked.filter((r) => r.entry.bedType === WARD_BED_TYPE);
  const skipped = ranked.length - eligible.length;
  const top = eligible[0];

  if (!bed) {
    return (
      <>
        <PageHeader title={t('screen.D11.title')} back={back} />
        <Card><EmptyState title={t('bedDetail.notFound')} body={t('bedDetail.notFoundBody', { max: beds.length })} /></Card>
      </>
    );
  }

  const assign = (r: Ranked, reason: string) => {
    dispatch({ type: 'assign', bedId: bed.id, entryId: r.entry.id, at: new Date().toISOString(), by: user.name });
    logAudit(
      r === top ? `Assigned Bed ${bed.id} to ${r.entry.name} (top of queue)` : `Assigned Bed ${bed.id} to ${r.entry.name} instead of ${top.entry.name}`,
      reason,
    );
    toast(t('assign.toast', { name: r.entry.name, bed: bed.id }));
    // The admission desk has no bed screens, so it goes back to the queue.
    navigate(role === 'desk' ? '/queue' : `/beds/${bed.id}`);
  };

  const chosen = eligible.find((r) => r.entry.id === other);
  const title = <span className="tabular-nums">{t('assign.title', { bed: bed.id })}</span>;

  if (bed.status !== 'ready') {
    return (
      <>
        <PageHeader title={title} back={back} />
        <Card>
          <EmptyState
            title={t('assign.notReady', { bed: bed.id })}
            body={bed.status === 'reserved' && bed.reservedFor ? t('assign.alreadyFor', { name: bed.reservedFor }) : t('assign.notReadyBody', { status: t(`bed.${bed.status}`) })}
            action={<Link to="/beds" className="btn-secondary">{t('screen.D6.title')}</Link>}
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title={title} subtitle={<span className="flex items-center gap-2"><BedStatusChip status={bed.status} /> {t('bedType.General')}</span>} back={back} />
      {loading ? <Skeleton className="h-64 max-w-3xl" /> : error ? <Card><ErrorState onRetry={retry} /></Card> : !top ? (
        <Card><EmptyState title={t('queue.empty')} body={t('assign.noneBody')} action={<Link to="/queue/add" className="btn-secondary">{t('screen.D9.title')}</Link>} /></Card>
      ) : (
        <div className="max-w-3xl space-y-6">
          <Card title={t('assign.topMatch')}>
            <div className="space-y-4 p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold">{top.entry.name}</p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-ink-700 tabular-nums">
                    <PriorityBadge priority={top.entry.priority} /> #{top.rank} · {t('time.h', { n: top.score.hours })}
                  </p>
                </div>
                <BedDouble size={24} aria-hidden className="text-primary-600" />
              </div>
              <div className="rounded-control bg-primary-50 p-3"><WhyHere r={top} /></div>
              {skipped > 0 && <p className="text-sm text-ink-700">{t('assign.skippedIcu', { n: skipped })}</p>}
              <p className="text-sm text-ink-700">{t('assign.notify')}</p>
              <button type="button" disabled={serverDown} title={serverDown ? t('common.paused') : undefined} onClick={() => assign(top, '')} className="btn-primary">
                <CircleCheck size={16} aria-hidden /> {t('assign.confirm', { name: top.entry.name })}
              </button>
            </div>
          </Card>

          {eligible.length > 1 && (
            <Card title={t('assign.other')}>
              <div className="p-4">
                <fieldset>
                  <legend className="mb-2 text-sm text-ink-700">{t('assign.otherHelp')}</legend>
                  <ul className="space-y-2">
                    {eligible.slice(1).map((r) => (
                      <li key={r.entry.id}>
                        <label className={`flex h-12 cursor-pointer items-center gap-3 rounded-control border px-3 ${other === r.entry.id ? 'border-2 border-primary-600 bg-primary-50' : 'border-border-input'}`}>
                          <input type="radio" name="other" value={r.entry.id} checked={other === r.entry.id} onChange={() => setOther(r.entry.id)} className="h-5 w-5 accent-primary-600" />
                          <span className="font-semibold">{r.entry.name}</span>
                          <PriorityBadge priority={r.entry.priority} />
                          <span className="ml-auto text-sm text-ink-700 tabular-nums">#{r.rank} · {r.score.total}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </fieldset>
                <button type="button" disabled={!chosen || serverDown} onClick={() => setPicking(true)} className="btn-secondary mt-4">
                  {t('assign.pick')}
                </button>
              </div>
            </Card>
          )}
        </div>
      )}

      <ReasonDialog
        open={picking && !!chosen}
        title={chosen && top ? t('assign.pickTitle', { name: chosen.entry.name, bed: bed.id }) : ''}
        body={chosen && top ? t('assign.pickBody', { name: chosen.entry.name, top: top.entry.name }) : ''}
        actionLabel={t('assign.pickAction')}
        onCancel={() => setPicking(false)}
        onConfirm={(reason) => { setPicking(false); if (chosen) assign(chosen, reason); }}
      />
    </>
  );
}
