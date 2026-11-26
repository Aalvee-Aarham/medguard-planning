// Critical fall alarm (theme "Alerts, level 1"): full-screen takeover, solid #B42318, white text, 32 px title,
// patient name, time, blurred snapshot, two 56 px buttons. Same as the Ward app; the manager receives it when
// the nurse's alarm is not answered in time. Repeating sound + vibration, and it still works with sound off.
// Never animated in or delayed (safety): only the icon pulses once per second.
// Shown above everything, including the lock screen; the admission desk does not receive it.
import { Siren, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CameraFeed } from '../components/CameraFeed';
import { ESCALATE_AFTER_SECS } from '../mock/incidents';
import { useStore, useT } from '../state/store';
import { formatTime } from '../utils/format';
import { useDuration, useNow } from '../utils/hooks';

/** Short repeating beep with Web Audio (no sound files). */
function useAlarmSound(on: boolean) {
  useEffect(() => {
    if (!on) return;
    let ctx: AudioContext | null = null;
    try { ctx = new AudioContext(); } catch { return; }
    const beep = () => {
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.15;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    };
    beep();
    const timer = setInterval(beep, 1200);
    navigator.vibrate?.([400, 200, 400, 200, 400]);
    return () => { clearInterval(timer); navigator.vibrate?.(0); ctx?.close(); };
  }, [on]);
}

export function FallAlarm() {
  const { alarmId, incidents, cameras, beds, cameraEvents, role, user, dispatch, logAudit, toast } = useStore();
  const t = useT();
  const dur = useDuration();
  const now = useNow(1000);
  const [muted, setMuted] = useState(false);
  const [falseStep, setFalseStep] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState(false);
  const going = useRef<HTMLButtonElement>(null);

  const incident = incidents.find((i) => i.id === alarmId);
  const show = !!incident && role !== 'desk';
  useAlarmSound(show && !muted);

  useEffect(() => {
    if (!show) return;
    setFalseStep(false);
    setReason('');
    going.current?.focus();
  }, [show, alarmId]);

  if (!show || !incident) return null;

  const bed = beds.find((b) => b.id === incident.bedId);
  const camera = cameras.find((c) => c.id === bed?.cameraId);
  const event = cameraEvents.find((e) => e.id === `ce-${incident.id}`);
  const escalated = incident.timeline.find((s) => s.step === 'escalated');
  const waiting = Math.max(0, Math.round((now - new Date(incident.at).getTime()) / 1000));

  const goingNow = () => {
    dispatch({ type: 'fall-ack', id: incident.id, at: new Date().toISOString(), by: user.name });
    logAudit(`Fall alarm Bed ${incident.bedId}: ${user.name} going`, '');
    toast(t('alarm.goingToast', { bed: incident.bedId }));
  };

  const confirmFalse = () => {
    if (reason.trim().length < 5) { setReasonError(true); return; }
    dispatch({ type: 'fall-false', id: incident.id, at: new Date().toISOString(), by: user.name, reason: reason.trim() });
    logAudit(`Fall alarm Bed ${incident.bedId} marked false alarm`, reason.trim());
    toast(t('alarm.falseToast', { bed: incident.bedId }));
  };

  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="fall-title" aria-describedby="fall-body" className="fixed inset-0 z-[70] flex flex-col bg-danger-text text-surface">
      <div className="flex items-center justify-between px-8 pt-6">
        <p className="text-lg font-semibold">{t('alarm.escalatedTo', { name: user.name })}</p>
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-pressed={muted}
          className="inline-flex h-12 items-center gap-2 rounded-control border-2 border-surface px-4 font-semibold"
        >
          {muted ? <VolumeX size={20} aria-hidden /> : <Volume2 size={20} aria-hidden />}
          {muted ? t('alarm.soundOff') : t('alarm.soundOn')}
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-1 items-center gap-12 px-8">
        <div className="flex-1">
          <Siren size={64} strokeWidth={1.75} aria-hidden className="fall-pulse" />
          <h1 id="fall-title" className="mt-4 text-[32px] font-bold leading-10">{t('alert.fall.title', { bed: incident.bedId })}</h1>
          <div id="fall-body" className="mt-2 space-y-1 text-lg">
            <p className="text-2xl font-semibold">{incident.patient}</p>
            <p className="tabular-nums">{t('alarm.at', { time: formatTime(incident.at), ago: dur(waiting) })}</p>
            {escalated && <p className="font-semibold">{t('alarm.noAnswer', { secs: ESCALATE_AFTER_SECS })}</p>}
          </div>

          {!falseStep ? (
            <div className="mt-8 flex flex-wrap gap-4">
              <button ref={going} type="button" onClick={goingNow} className="h-14 rounded-control bg-surface px-8 text-lg font-bold text-danger-text">
                {t('alarm.going')}
              </button>
              <button type="button" onClick={() => setFalseStep(true)} className="h-14 rounded-control border-2 border-surface px-8 text-lg font-semibold">
                {t('alarm.false')}
              </button>
            </div>
          ) : (
            <div className="mt-8 max-w-md rounded-card bg-surface p-4 text-ink-900">
              <label htmlFor="false-reason" className="font-semibold">{t('alarm.falseReason')}</label>
              <p className="text-sm text-ink-500">{t('dialog.reasonHelp')}</p>
              <textarea
                id="false-reason"
                autoFocus
                rows={2}
                value={reason}
                onChange={(e) => { setReason(e.target.value); setReasonError(false); }}
                aria-invalid={reasonError}
                className={`input mt-2 h-auto w-full py-2 ${reasonError ? 'border-2 border-danger-text' : ''}`}
              />
              {reasonError && <p role="alert" className="mt-1 text-sm text-danger-text">{t('dialog.reasonError')}</p>}
              <div className="mt-4 flex justify-between gap-4">
                <button type="button" onClick={() => setFalseStep(false)} className="btn-secondary">{t('dialog.cancel')}</button>
                <button type="button" onClick={confirmFalse} className="btn-danger">{t('alarm.falseConfirm')}</button>
              </div>
            </div>
          )}
        </div>

        {camera && event && (
          <figure className="w-80 shrink-0">
            <div className="rounded-card bg-surface p-2"><CameraFeed camera={camera} beds={beds} events={cameraEvents} now={now} snapshot={event} size="tile" /></div>
            <figcaption className="mt-2 text-sm">{t('alarm.snapshot', { cam: camera.id })}</figcaption>
          </figure>
        )}
      </div>
    </div>
  );
}
