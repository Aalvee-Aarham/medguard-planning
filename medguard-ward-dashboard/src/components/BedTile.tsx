// Bed number, status (colour + icon + word), patient and time in status. Click opens D7.
// On camera-related views pass showName={false}: only the patient ID is shown there.
import { Siren } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PATIENTS } from '../mock/data';
import type { Bed } from '../mock/types';
import { useStore, useT } from '../state/store';
import { useAgo } from '../utils/hooks';
import { BED_STATUS, BedStatusChip } from './Chips';

const EDGE: Record<Bed['status'], string> = {
  occupied: 'border-primary-100',
  ready: 'border-success-border',
  cleaning: 'border-warning-border',
  reserved: 'border-primary-100',
  oos: 'border-border-subtle',
};

export function BedTile({ bed, showName = true }: { bed: Bed; showName?: boolean }) {
  const t = useT();
  const ago = useAgo();
  const { alerts } = useStore();
  // Open fall on this bed: red edge and a "Fall alert" chip whose icon pulses once per second (theme section 10).
  const fall = alerts.some((a) => a.kind === 'fall' && a.bedId === bed.id && !a.acknowledged);
  const patient = PATIENTS.find((p) => p.id === bed.patientId);
  const Icon = BED_STATUS[bed.status].icon;

  return (
    <Link
      to={`/beds/${bed.id}`}
      className={`flex min-h-[132px] flex-col rounded-card border-2 p-3 transition-colors duration-150 ease-out ${
        fall ? 'border-danger-text bg-danger-bg' : `bg-surface hover:border-primary-600 hover:bg-primary-50 ${EDGE[bed.status]}`
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-lg font-semibold tabular-nums">{t('common.bed', { n: bed.id })}</span>
        <Icon size={20} strokeWidth={1.75} aria-hidden className="text-ink-500" />
      </span>
      <span className="mt-2 flex flex-wrap gap-1">
        <BedStatusChip status={bed.status} />
        {fall && (
          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-danger-border bg-surface px-2 py-1 text-sm font-semibold leading-4 text-danger-text">
            <Siren size={16} strokeWidth={1.75} aria-hidden className="fall-pulse" /> {t('bed.fallAlert')}
          </span>
        )}
      </span>
      <span className="mt-2 min-h-6 truncate text-sm">
        {bed.reservedFor ? (
          <span className="font-semibold">{t('bedmap.reservedFor', { name: bed.reservedFor })}</span>
        ) : patient ? (
          showName ? <span className="font-semibold">{patient.name}</span> : <span className="tabular-nums">{patient.id}</span>
        ) : (
          <span className="text-ink-500">{t('bedmap.noPatient')}</span>
        )}
      </span>
      <span className="text-xs text-ink-500 tabular-nums">{t('common.for', { time: ago(bed.since) })}</span>
    </Link>
  );
}
