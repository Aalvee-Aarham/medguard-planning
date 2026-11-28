// D7 Bed detail: current patient, history, cleaning log, mapped camera.
import { Cctv, CircleCheck, Sparkles, TriangleAlert, UserRound, Wifi } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { BedStatusChip, Chip, type Tone } from '../../components/Chips';
import { Card, PageHeader } from '../../components/PageHeader';
import { EmptyState, ErrorState, Skeleton } from '../../components/States';
import { CAMERA_BEDS, PATIENTS } from '../../mock/data';
import type { BedEvent, Patient } from '../../mock/types';
import { useStore, useT } from '../../state/store';
import { formatDate, formatTime } from '../../utils/format';
import { useAgo, useMockLoad } from '../../utils/hooks';
import { useMarkReady } from './useMarkReady';

const CLEANING = new Set<BedEvent['kind']>(['cleaningStart', 'cleaningDone', 'markedReady']);
const RISK_TONE: Record<Patient['fallRisk'], Tone> = { high: 'danger', medium: 'warning', low: 'neutral' };

function PatientCard({ patient }: { patient?: Patient }) {
  const t = useT();
  if (!patient) {
    return (
      <Card title={t('bedDetail.patient')}>
        <p className="flex items-center gap-2 p-4 text-ink-700"><UserRound size={20} aria-hidden /> {t('bedDetail.noPatient')}</p>
      </Card>
    );
  }
  return (
    <Card title={t('bedDetail.patient')}>
      <div className="space-y-3 p-4">
        <div>
          <p className="text-lg font-semibold">{patient.name}</p>
          <p className="text-sm text-ink-700 tabular-nums">
            {patient.id} · {t('bedDetail.age', { age: patient.age, sex: t(`sex.${patient.sex}`) })}
          </p>
        </div>
        {/* Allergies always visible; "No known allergies" written, never blank (safety rule 5). */}
        {patient.allergies.length ? (
          <p className="flex items-center gap-2 rounded-control border border-danger-border bg-danger-bg px-3 py-2 font-semibold text-danger-text">
            <TriangleAlert size={20} aria-hidden className="shrink-0" /> {t('bedDetail.allergies', { list: patient.allergies.join(', ') })}
          </p>
        ) : (
          <p className="flex items-center gap-2 rounded-control border border-border-subtle bg-neutral-bg px-3 py-2 font-semibold text-neutral-text">
            <CircleCheck size={20} aria-hidden className="shrink-0" /> {t('bedDetail.noAllergies')}
          </p>
        )}
        <Chip tone={RISK_TONE[patient.fallRisk]} icon={TriangleAlert}>{t(`fallRisk.${patient.fallRisk}`)}</Chip>
        <p className="text-ink-700">{patient.summary}</p>
      </div>
    </Card>
  );
}

function EventList({ events, empty }: { events: BedEvent[]; empty: string }) {
  const t = useT();
  if (!events.length) return <p className="p-4 text-ink-700">{empty}</p>;
  return (
    <ol className="divide-y divide-border-subtle">
      {events.map((e) => (
        <li key={e.id} className="flex items-baseline gap-4 px-4 py-3">
          <span className="w-36 shrink-0 text-sm text-ink-500 tabular-nums">{formatDate(e.at)}, {formatTime(e.at)}</span>
          <span className="flex-1">
            <span className="font-semibold">{t(`bedEvent.${e.kind}`, { patient: e.patient ?? '' })}</span>
            <span className="text-sm text-ink-700"> · {e.by}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function BedDetail() {
  const { beds, bedEvents } = useStore();
  const t = useT();
  const ago = useAgo();
  const { bedId } = useParams();
  const { loading, error, retry } = useMockLoad();
  const { markReady, disabled, disabledReason } = useMarkReady();

  const back = { to: '/beds', label: t('screen.D6.title') };
  const bed = beds.find((b) => String(b.id) === bedId);

  if (!bed) {
    return (
      <>
        <PageHeader title={t('bedDetail.notFound')} back={back} />
        <Card><EmptyState title={t('bedDetail.notFound')} body={t('bedDetail.notFoundBody', { max: beds.length })} /></Card>
      </>
    );
  }

  const patient = PATIENTS.find((p) => p.id === bed.patientId);
  const history = bedEvents.filter((e) => e.bedId === bed.id).sort((a, b) => b.at.localeCompare(a.at));
  const cleaning = history.filter((e) => CLEANING.has(e.kind));

  return (
    <>
      <PageHeader
        back={back}
        title={<span className="tabular-nums">{t('common.bed', { n: bed.id })}</span>}
        subtitle={
          <span className="flex items-center gap-3">
            <BedStatusChip status={bed.status} />
            <span className="tabular-nums">{t('common.for', { time: ago(bed.since) })}</span>
          </span>
        }
        actions={
          bed.status === 'cleaning' ? (
            <button type="button" disabled={disabled} title={disabledReason} onClick={() => markReady(bed.id)} className="btn-primary">
              <Sparkles size={16} aria-hidden /> {t('beds.markReady')}
            </button>
          ) : bed.status === 'ready' ? (
            <Link to={`/queue/assign/${bed.id}`} className="btn-primary">{t('beds.assign')}</Link>
          ) : null
        }
      />

      {loading ? (
        <div role="status" aria-label="Loading" className="grid grid-cols-12 gap-6">
          <Skeleton className="col-span-5 h-64" />
          <Skeleton className="col-span-7 h-64" />
        </div>
      ) : error ? (
        <Card><ErrorState onRetry={retry} /></Card>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-5 space-y-6">
            {bed.reservedFor ? (
              <Card title={t('bedDetail.patient')}><p className="p-4 font-semibold">{t('bedmap.reservedFor', { name: bed.reservedFor })}</p></Card>
            ) : <PatientCard patient={patient} />}
            <Card title={t('bedDetail.camera')}>
              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-semibold tabular-nums"><Cctv size={20} aria-hidden /> {bed.cameraId}</span>
                  <Chip tone="success" icon={Wifi}>{t('bedDetail.online')}</Chip>
                </div>
                <p className="text-sm text-ink-700">{t('bedDetail.cameraBody', { cam: bed.cameraId, range: CAMERA_BEDS[bed.cameraId] })}</p>
                <Link to={`/camera/${bed.cameraId}`} className="btn-secondary">{t('bedDetail.openCamera')}</Link>
              </div>
            </Card>
          </div>
          <div className="col-span-7 space-y-6">
            <Card title={t('bedDetail.cleaning')}>
              <EventList events={cleaning} empty={t('bedDetail.noCleaning')} />
            </Card>
            <Card title={t('bedDetail.history')}>
              <EventList events={history} empty={t('state.empty')} />
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
