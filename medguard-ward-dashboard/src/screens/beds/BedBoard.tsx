// D6 Bed board: every bed with status and time in status; filter by status; Mark ready.
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BED_STATUS, BedStatusChip } from '../../components/Chips';
import { DataTable, type Column } from '../../components/DataTable';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/States';
import { PATIENTS } from '../../mock/data';
import type { Bed, BedStatus } from '../../mock/types';
import { useStore, useT } from '../../state/store';
import { useAgo, useMockLoad } from '../../utils/hooks';
import { useMarkReady } from './useMarkReady';

const STATUSES: BedStatus[] = ['occupied', 'ready', 'cleaning', 'reserved', 'oos'];

export function BedBoard() {
  const { beds, ward } = useStore();
  const t = useT();
  const ago = useAgo();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { loading, error, retry } = useMockLoad();
  const { markReady, disabled, disabledReason } = useMarkReady();

  const raw = params.get('status');
  const filter = STATUSES.includes(raw as BedStatus) ? (raw as BedStatus) : null;
  const rows = filter ? beds.filter((b) => b.status === filter) : beds;
  const patientOf = (b: Bed) => PATIENTS.find((p) => p.id === b.patientId);

  const setFilter = (s: BedStatus | null) => setParams(s ? { status: s } : {}, { replace: true });

  const columns: Column<Bed>[] = [
    { key: 'bed', header: t('beds.col.bed'), render: (b) => <span className="font-semibold tabular-nums">{t('common.bed', { n: b.id })}</span>, sortValue: (b) => b.id },
    { key: 'status', header: t('beds.col.status'), render: (b) => <BedStatusChip status={b.status} />, sortValue: (b) => STATUSES.indexOf(b.status) },
    {
      key: 'patient', header: t('beds.col.patient'),
      render: (b) => {
        const p = patientOf(b);
        if (b.reservedFor) return <span className="font-semibold">{t('bedmap.reservedFor', { name: b.reservedFor })}</span>;
        return p ? <span><span className="font-semibold">{p.name}</span> <span className="text-ink-500 tabular-nums">{p.id}</span></span> : <span className="text-ink-500">{t('bedmap.noPatient')}</span>;
      },
      sortValue: (b) => patientOf(b)?.name ?? '~',
    },
    // Longest first when sorted descending: oldest "since" = biggest number.
    { key: 'time', header: t('beds.col.time'), render: (b) => <span className="tabular-nums">{ago(b.since)}</span>, sortValue: (b) => -new Date(b.since).getTime(), align: 'right' },
    { key: 'camera', header: t('beds.col.camera'), render: (b) => <span className="tabular-nums">{b.cameraId}</span> },
    {
      key: 'action', header: t('beds.col.action'), align: 'right',
      render: (b) =>
        b.status === 'cleaning' ? (
          <button
            type="button"
            disabled={disabled}
            title={disabledReason}
            onClick={(e) => { e.stopPropagation(); markReady(b.id); }}
            className="btn-secondary h-10"
          >
            {t('beds.markReady')}
          </button>
        ) : b.status === 'ready' ? (
          <Link to={`/queue/assign/${b.id}`} onClick={(e) => e.stopPropagation()} className="btn-secondary h-10">{t('beds.assign')}</Link>
        ) : null,
    },
  ];

  const pill = (active: boolean) =>
    `inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold ${
      active ? 'border-primary-600 bg-primary-100 text-primary-700' : 'border-border-subtle bg-surface text-ink-700 hover:border-primary-600'
    }`;

  const filters = (
    <div role="group" aria-label={t('beds.filter')} className="flex flex-wrap gap-2">
      <button type="button" aria-pressed={!filter} onClick={() => setFilter(null)} className={pill(!filter)}>
        {t('beds.all')} <span className="tabular-nums">{beds.length}</span>
      </button>
      {STATUSES.map((s) => {
        const Icon = BED_STATUS[s].icon;
        const n = beds.filter((b) => b.status === s).length;
        return (
          <button key={s} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)} className={pill(filter === s)}>
            <Icon size={16} aria-hidden /> {t(`bed.${s}`)} <span className="tabular-nums">{n}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      <PageHeader title={t('screen.D6.title')} subtitle={t('beds.subtitle', { ward: ward.name, n: beds.length })} />
      <DataTable
        caption={t('screen.D6.title')}
        rows={rows}
        columns={columns}
        rowId={(b) => String(b.id)}
        onRowClick={(b) => navigate(`/beds/${b.id}`)}
        filters={filters}
        loading={loading}
        error={error}
        onRetry={retry}
        empty={
          <EmptyState
            title={t('beds.noMatch')}
            action={<button type="button" onClick={() => setFilter(null)} className="btn-secondary">{t('beds.showAll')}</button>}
          />
        }
      />
    </>
  );
}
