// Dev page: the shared components from PLAN.md section 5, so they can be checked before screens use them.
import { BedDouble, Bell, Clock, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { BedStatusChip, PriorityBadge } from '../components/Chips';
import { DataTable, type Column } from '../components/DataTable';
import { ReasonDialog } from '../components/ReasonDialog';
import { StatTile } from '../components/StatTile';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import { mockFetch } from '../mock/api';
import { PATIENTS, QUEUE } from '../mock/data';
import type { BedStatus, Patient, Priority } from '../mock/types';
import { useStore } from '../state/store';
import { formatTime } from '../utils/format';

const STATUSES: BedStatus[] = ['occupied', 'ready', 'cleaning', 'reserved', 'oos'];
const PRIORITIES: Priority[] = ['P1', 'P2', 'P3'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function ComponentGallery() {
  const { beds, openAlerts, forceErrors, serverDown, audit, logAudit, toast } = useStore();
  const [rows, setRows] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dialog, setDialog] = useState(false);

  // Loads through the mock API, so "Force errors" in the Dev panel shows the error state.
  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    mockFetch(PATIENTS, { forceError: forceErrors, serverDown })
      .then(setRows)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [forceErrors, serverDown]);
  useEffect(load, [load]);

  const columns: Column<Patient>[] = [
    { key: 'name', header: 'Patient', render: (p) => <span className="font-semibold">{p.name}</span>, sortValue: (p) => p.name },
    { key: 'id', header: 'ID', render: (p) => p.id, sortValue: (p) => p.id },
    { key: 'bed', header: 'Bed', render: (p) => (p.bedId ? `Bed ${p.bedId}` : '—'), sortValue: (p) => p.bedId ?? 99, align: 'right' },
    { key: 'age', header: 'Age', render: (p) => p.age, sortValue: (p) => p.age, align: 'right' },
    { key: 'allergies', header: 'Allergies', render: (p) => (p.allergies.length ? <span className="font-semibold text-danger-text">{p.allergies.join(', ')}</span> : 'No known allergies') },
  ];

  const free = beds.filter((b) => b.status === 'ready' || b.status === 'cleaning').length;

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-2xl font-semibold">Component gallery</h1>
        <p className="mt-1 text-ink-700">Shared building blocks used by all 21 screens. Dev only.</p>
      </div>

      <Section title="Bed status chips">
        <div className="flex flex-wrap gap-2">{STATUSES.map((s) => <BedStatusChip key={s} status={s} />)}</div>
      </Section>

      <Section title="Priority badges">
        <div className="flex flex-wrap gap-2">{PRIORITIES.map((p) => <PriorityBadge key={p} priority={p} />)}</div>
      </Section>

      <Section title="Stat tiles (live: they change as mock events arrive)">
        <div className="grid grid-cols-4 gap-6">
          <StatTile label="Free beds" value={free} icon={BedDouble} trend="Ready or being cleaned" />
          <StatTile label="Open alerts" value={openAlerts} icon={Bell} trend="Not yet acknowledged" />
          <StatTile label="Doses on time" value="91%" icon={Clock} trend="Today, up from 84%" />
          <StatTile label="Staff on duty" value={4} icon={Users} trend="2 nurses, 1 senior, 1 doctor" />
        </div>
      </Section>

      <Section title="Data table (sort, search, pagination, loading and error)">
        <DataTable
          caption="Ward patients"
          rows={rows}
          columns={columns}
          rowId={(p) => p.id}
          pageSize={5}
          searchText={(p) => `${p.name} ${p.id}`}
          loading={loading}
          error={error}
          onRetry={load}
          onRowClick={(p) => toast(`Clicked ${p.name}`)}
        />
      </Section>

      <Section title="Reason dialog (confirm + required reason, saved to audit log)">
        <button type="button" className="btn-primary" onClick={() => setDialog(true)}>Override queue order</button>
        <ReasonDialog
          open={dialog}
          title="Move Mizanur Rahman above Rokeya Sultana?"
          body="Mizanur Rahman will be offered the next free bed before Rokeya Sultana. Both patients and the desk see the new order."
          actionLabel="Move up"
          onCancel={() => setDialog(false)}
          onConfirm={(reason) => {
            logAudit('Queue override: Mizanur Rahman above Rokeya Sultana', reason);
            setDialog(false);
            toast('Queue order changed');
          }}
        />
        {audit.length > 0 && (
          <ul className="space-y-1 text-sm">
            {audit.map((a) => (
              <li key={a.id} className="text-ink-700">
                <span className="tabular-nums">{formatTime(a.at)}</span> · {a.by} · {a.action} · <em>“{a.reason}”</em>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Page states">
        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-2 rounded-card border border-border-subtle bg-surface p-4">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
          <div className="rounded-card border border-border-subtle bg-surface">
            <EmptyState title="No one waiting" body={`${QUEUE.length} patients were placed today.`} action={<button type="button" className="btn-secondary">Add to queue</button>} />
          </div>
          <div className="rounded-card border border-border-subtle bg-surface">
            <ErrorState onRetry={() => toast('Retrying')} />
          </div>
        </div>
      </Section>
    </div>
  );
}
