// D16 Incident log: falls and missed doses with time, bed, response time and outcome.
import { BellRing, Clock, Siren, Timer } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Chip } from '../../components/Chips';
import { DataTable, type Column } from '../../components/DataTable';
import { PageHeader } from '../../components/PageHeader';
import { StatTile } from '../../components/StatTile';
import type { Incident } from '../../mock/types';
import { useStore, useT } from '../../state/store';
import { formatDate, formatTime } from '../../utils/format';
import { useDuration, useMockLoad } from '../../utils/hooks';

type Kind = 'all' | Incident['kind'];

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

export function KindChip({ kind }: { kind: Incident['kind'] }) {
  const t = useT();
  return kind === 'fall' ? <Chip tone="danger" icon={Siren}>{t('incident.kind.fall')}</Chip> : <Chip tone="warning" icon={Clock}>{t('incident.kind.missed')}</Chip>;
}

export function IncidentLog() {
  const { incidents } = useStore();
  const t = useT();
  const dur = useDuration();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { loading, error, retry } = useMockLoad();

  const kind: Kind = params.get('kind') === 'fall' || params.get('kind') === 'missed' ? (params.get('kind') as Kind) : 'all';
  const rows = kind === 'all' ? incidents : incidents.filter((i) => i.kind === kind);
  const falls = incidents.filter((i) => i.kind === 'fall');
  const responded = falls.filter((i) => i.responseSecs !== undefined).map((i) => i.responseSecs!);
  const escalations = incidents.filter((i) => i.timeline.some((s) => s.step === 'escalated')).length;
  const open = incidents.filter((i) => i.status === 'open').length;

  const columns: Column<Incident>[] = [
    { key: 'at', header: t('incident.col.time'), sortValue: (i) => i.at, render: (i) => <span className="tabular-nums">{formatDate(i.at)}, {formatTime(i.at)}</span> },
    { key: 'kind', header: t('incident.col.type'), render: (i) => <KindChip kind={i.kind} /> },
    { key: 'bed', header: t('beds.col.bed'), sortValue: (i) => i.bedId, render: (i) => <span className="tabular-nums">{t('common.bed', { n: i.bedId })}</span> },
    { key: 'patient', header: t('beds.col.patient'), sortValue: (i) => i.patient, render: (i) => <span className="font-semibold">{i.patient}</span> },
    {
      key: 'response', header: t('incident.col.response'), align: 'right', sortValue: (i) => i.responseSecs ?? Infinity,
      render: (i) => (
        <span className="inline-flex items-center gap-2 tabular-nums">
          {i.timeline.some((s) => s.step === 'escalated') && <span title={t('incident.escalated')}><BellRing size={16} aria-label={t('incident.escalated')} className="text-danger-text" /></span>}
          {i.responseSecs !== undefined ? dur(i.responseSecs) : '—'}
        </span>
      ),
    },
    {
      key: 'outcome', header: t('incident.col.outcome'),
      render: (i) => i.status === 'open' ? <Chip tone="danger" icon={BellRing}>{t('incident.open')}</Chip> : <span>{i.outcome ? t(i.outcome) : '—'}</span>,
    },
  ];

  const pill = (active: boolean) =>
    `inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold ${active ? 'border-primary-600 bg-primary-100 text-primary-700' : 'border-border-subtle bg-surface text-ink-700 hover:border-primary-600'}`;

  return (
    <>
      <PageHeader title={t('screen.D16.title')} subtitle={t('incident.subtitle')} />
      <div className="mb-6 grid grid-cols-4 gap-6">
        <StatTile label={t('incident.tile.falls')} value={falls.length} icon={Siren} trend={t('incident.tile.last28')} />
        <StatTile label={t('incident.tile.response')} value={dur(median(responded))} icon={Timer} trend={t('incident.tile.responseHint')} />
        <StatTile label={t('incident.tile.escalations')} value={escalations} icon={BellRing} trend={t('incident.tile.escalationsHint')} />
        <StatTile label={t('incident.tile.open')} value={open} icon={Clock} tone={open ? 'danger' : 'neutral'} trend={t('incident.tile.openHint')} />
      </div>
      <DataTable
        caption={t('screen.D16.title')}
        rows={rows}
        columns={columns}
        rowId={(i) => i.id}
        onRowClick={(i) => navigate(`/incidents/${i.id}`)}
        pageSize={10}
        loading={loading}
        error={error}
        onRetry={retry}
        searchText={(i) => `${i.patient} ${i.id} ${i.bedId}`}
        filters={
          <div role="group" aria-label={t('incident.filter')} className="flex gap-2">
            {(['all', 'fall', 'missed'] as Kind[]).map((k) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => setParams(k === 'all' ? {} : { kind: k }, { replace: true })} className={pill(kind === k)}>
                {t(`incident.filter.${k}`)} <span className="tabular-nums">{k === 'all' ? incidents.length : incidents.filter((i) => i.kind === k).length}</span>
              </button>
            ))}
          </div>
        }
      />
    </>
  );
}
