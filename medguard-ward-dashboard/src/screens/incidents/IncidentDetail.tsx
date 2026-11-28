// D17 Incident detail: alarm timeline (sent → escalated → acknowledged → resolved) with times, outcome and notes.
// An open incident can be resolved here: outcome + notes are required and saved in the audit log.
import { BellRing, CheckCheck, CircleCheck, CircleDashed, Send } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CameraFeed } from '../../components/CameraFeed';
import { Chip } from '../../components/Chips';
import { Card, PageHeader } from '../../components/PageHeader';
import { EmptyState, ErrorState, Skeleton } from '../../components/States';
import type { CameraEvent, IncidentStep } from '../../mock/types';
import { useStore, useT } from '../../state/store';
import { formatDate, formatTime } from '../../utils/format';
import { useDuration, useMockLoad, useNow } from '../../utils/hooks';
import { KindChip } from './IncidentLog';

const STEPS: { step: IncidentStep; icon: typeof Send }[] = [
  { step: 'sent', icon: Send },
  { step: 'escalated', icon: BellRing },
  { step: 'acknowledged', icon: CheckCheck },
  { step: 'resolved', icon: CircleCheck },
];
const OUTCOMES = {
  fall: ['outcome.noInjury', 'outcome.minorBruise', 'outcome.noInjuryXray', 'outcome.transferred', 'outcome.falseAlarm'],
  missed: ['outcome.givenLate', 'outcome.held', 'outcome.refused'],
};

export function IncidentDetail() {
  const { incidents, beds, cameras, cameraEvents, serverDown, user, dispatch, logAudit, toast } = useStore();
  const t = useT();
  const dur = useDuration();
  const now = useNow(1000);
  const { id } = useParams();
  const { loading, error, retry } = useMockLoad();
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ outcome?: boolean; notes?: boolean }>({});

  const back = { to: '/incidents', label: t('screen.D16.title') };
  const inc = incidents.find((i) => i.id === id);
  if (!inc) {
    return (
      <>
        <PageHeader title={t('incident.notFound')} back={back} />
        <Card><EmptyState title={t('incident.notFound')} action={<Link to="/incidents" className="btn-secondary">{t('screen.D16.title')}</Link>} /></Card>
      </>
    );
  }

  const bed = beds.find((b) => b.id === inc.bedId);
  const camera = cameras.find((c) => c.id === bed?.cameraId);
  const snapshot: CameraEvent | undefined = inc.kind === 'fall' && camera
    ? cameraEvents.find((e) => e.id === `ce-${inc.id}`) ?? { id: `snap-${inc.id}`, cameraId: camera.id, bedId: inc.bedId, kind: 'fall', at: inc.at }
    : undefined;
  const start = new Date(inc.at).getTime();

  const resolve = (e: React.FormEvent) => {
    e.preventDefault();
    const next = { outcome: !outcome, notes: notes.trim().length < 5 };
    setErrors(next);
    if (next.outcome || next.notes) return;
    dispatch({ type: 'incident-resolve', id: inc.id, at: new Date().toISOString(), by: user.name, outcome, notes: notes.trim() });
    logAudit(`Resolved ${inc.id} (${inc.kind}, Bed ${inc.bedId}): ${t(outcome)}`, notes.trim());
    toast(t('incident.resolvedToast', { id: inc.id }));
  };

  return (
    <>
      <PageHeader
        back={back}
        title={<span className="tabular-nums">{inc.id} · {t(inc.kind === 'fall' ? 'alert.fall.title' : 'incident.missedTitle', { bed: inc.bedId })}</span>}
        subtitle={
          <span className="flex flex-wrap items-center gap-3">
            <KindChip kind={inc.kind} />
            {inc.status === 'open' ? <Chip tone="danger" icon={BellRing}>{t('incident.open')}</Chip> : <Chip tone="success" icon={CircleCheck}>{t('incident.resolved')}</Chip>}
            <span className="tabular-nums">{formatDate(inc.at)}, {formatTime(inc.at)} · {inc.patient}</span>
          </span>
        }
      />

      {loading ? <Skeleton className="h-80" /> : error ? <Card><ErrorState onRetry={retry} /></Card> : (
        <div className="grid grid-cols-12 gap-6">
          <Card title={t('incident.timeline')} className="col-span-12 xl:col-span-7">
            <ol className="p-4">
              {STEPS.map(({ step, icon: Icon }, idx) => {
                const done = inc.timeline.find((s) => s.step === step);
                const skipped = !done && (step === 'escalated' ? inc.timeline.some((s) => s.step === 'acknowledged') : false);
                return (
                  <li key={step} className="relative flex gap-4 pb-6 last:pb-0">
                    {idx < STEPS.length - 1 && <span aria-hidden className="absolute left-5 top-10 h-[calc(100%-40px)] w-px bg-border-subtle" />}
                    <span aria-hidden className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${done ? (step === 'escalated' ? 'bg-danger-bg text-danger-text' : 'bg-primary-50 text-primary-600') : 'bg-neutral-bg text-ink-500'}`}>
                      {done ? <Icon size={20} strokeWidth={1.75} /> : <CircleDashed size={20} strokeWidth={1.75} />}
                    </span>
                    <div className="min-w-0 pt-1">
                      <p className={`font-semibold ${done ? '' : 'text-ink-500'}`}>{t(`incident.step.${step}`)}</p>
                      {done ? (
                        <p className="text-sm text-ink-700 tabular-nums">
                          {formatTime(done.at)} · {step === 'sent' ? t('incident.from', { by: done.by ?? '' }) : t('incident.by', { by: done.by ?? '' })}
                          {step !== 'sent' && <> · <strong>{t('incident.after', { time: dur(Math.round((new Date(done.at).getTime() - start) / 1000)) })}</strong></>}
                        </p>
                      ) : (
                        <p className="text-sm text-ink-500">{skipped ? t('incident.notNeeded') : inc.status === 'open' ? t('incident.waiting', { time: dur(Math.round((now - start) / 1000)) }) : t('incident.notNeeded')}</p>
                      )}
                      {done?.note && <p className="mt-1 text-sm">“{done.note}”</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>

          <div className="col-span-12 space-y-6 xl:col-span-5">
            {snapshot && camera && (
              <Card title={t('incident.snapshot')}>
                <div className="p-3">
                  <CameraFeed camera={camera} beds={beds} events={cameraEvents} now={now} snapshot={snapshot} size="tile" />
                  <Link to={`/camera/${camera.id}`} className="mt-3 inline-block text-sm font-semibold text-primary-600 hover:underline">{t('incident.openCamera', { cam: camera.id })}</Link>
                </div>
              </Card>
            )}

            <Card title={t('incident.outcome')}>
              {inc.status === 'resolved' ? (
                <div className="space-y-2 p-4">
                  <p className="font-semibold">{inc.outcome ? t(inc.outcome) : '—'}</p>
                  {inc.drug && <p className="text-sm text-ink-700">{inc.drug}</p>}
                  {inc.notes && <p className="text-ink-700">“{inc.notes}”</p>}
                </div>
              ) : (
                <form onSubmit={resolve} noValidate className="space-y-4 p-4">
                  <label className="block">
                    <span className="font-semibold">{t('incident.outcome')}</span>
                    <select
                      value={outcome}
                      onChange={(e) => { setOutcome(e.target.value); setErrors({ ...errors, outcome: false }); }}
                      aria-invalid={errors.outcome}
                      className={`input mt-2 w-full ${errors.outcome ? 'border-2 border-danger-text' : ''}`}
                    >
                      <option value="">{t('incident.chooseOutcome')}</option>
                      {OUTCOMES[inc.kind].map((o) => <option key={o} value={o}>{t(o)}</option>)}
                    </select>
                    {errors.outcome && <span role="alert" className="mt-1 block text-sm text-danger-text">{t('incident.err.outcome')}</span>}
                  </label>
                  <label className="block">
                    <span className="font-semibold">{t('incident.notes')}</span>
                    <span className="block text-sm text-ink-500">{t('dialog.reasonHelp')}</span>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => { setNotes(e.target.value); setErrors({ ...errors, notes: false }); }}
                      aria-invalid={errors.notes}
                      className={`input mt-2 h-auto w-full py-2 ${errors.notes ? 'border-2 border-danger-text' : ''}`}
                    />
                    {errors.notes && <span role="alert" className="mt-1 block text-sm text-danger-text">{t('dialog.reasonError')}</span>}
                  </label>
                  <button type="submit" disabled={serverDown} title={serverDown ? t('common.paused') : undefined} className="btn-primary">{t('incident.resolve')}</button>
                </form>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
