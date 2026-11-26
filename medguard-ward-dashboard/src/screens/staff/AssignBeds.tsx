// D13 Assign beds to nurses: nurse columns; drag bed cards between them (native HTML5 drag, no library).
// Every card also has a "Move to" menu, so it works with a keyboard and screen reader.
// Ratio warning when a nurse has more patients than the rule allows. Save logs the change and notifies nurses.
import { GripVertical, RotateCcw, Save, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { BedStatusChip, Chip } from '../../components/Chips';
import { Card, PageHeader } from '../../components/PageHeader';
import { ErrorState, Skeleton } from '../../components/States';
import { PATIENTS, SHIFT_RULE } from '../../mock/data';
import { useStore, useT } from '../../state/store';
import { useMockLoad } from '../../utils/hooks';

type Plan = Record<string, number[]>;

export function AssignBeds() {
  const { staff, beds, serverDown, dispatch, logAudit, toast } = useStore();
  const t = useT();
  const { loading, error, retry } = useMockLoad();
  const nurses = staff.filter((s) => s.role !== 'doctor');
  const saved: Plan = Object.fromEntries(nurses.map((n) => [n.id, n.beds]));
  const [draft, setDraft] = useState<Plan>(saved);
  const [dragBed, setDragBed] = useState<number | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const occupied = new Set(beds.filter((b) => b.status === 'occupied').map((b) => b.id));
  const patientsOf = (id: string) => draft[id].filter((b) => occupied.has(b)).length;
  const ownerOf = (plan: Plan, bed: number) => Object.keys(plan).find((id) => plan[id].includes(bed));
  const changes = Object.values(draft).flat().filter((b) => ownerOf(draft, b) !== ownerOf(saved, b));
  const dirty = changes.length > 0;
  const nameOf = (id?: string) => nurses.find((n) => n.id === id)?.name ?? '';

  const move = (bed: number, to: string) => {
    setDraft((d) => {
      const next: Plan = Object.fromEntries(Object.entries(d).map(([id, list]) => [id, list.filter((b) => b !== bed)]));
      next[to] = [...next[to], bed].sort((a, b) => a - b);
      return next;
    });
  };

  const save = () => {
    dispatch({ type: 'assign-beds', beds: draft });
    logAudit(`Bed assignments changed: ${changes.map((b) => `Bed ${b} ${nameOf(ownerOf(saved, b))} → ${nameOf(ownerOf(draft, b))}`).join('; ')}`, '');
    toast(t('assignBeds.savedToast'));
  };

  return (
    <>
      <PageHeader
        title={t('screen.D13.title')}
        subtitle={t('assignBeds.subtitle', { max: SHIFT_RULE.patientsPerNurse })}
        back={{ to: '/staff', label: t('screen.D12.title') }}
        actions={
          <>
            <button type="button" disabled={!dirty} onClick={() => setDraft(saved)} className="btn-secondary"><RotateCcw size={16} aria-hidden /> {t('assignBeds.reset')}</button>
            <button type="button" disabled={!dirty || serverDown} title={serverDown ? t('common.paused') : undefined} onClick={save} className="btn-primary">
              <Save size={16} aria-hidden /> {t('assignBeds.save')}
            </button>
          </>
        }
      />
      {dirty && <p role="status" className="mb-4 rounded-control border border-primary-100 bg-primary-50 p-3 text-sm font-semibold text-primary-700">{t('assignBeds.unsaved', { n: changes.length })}</p>}

      {loading ? (
        <div role="status" aria-label="Loading" className="grid grid-cols-3 gap-6">{nurses.map((n) => <Skeleton key={n.id} className="h-96" />)}</div>
      ) : error ? (
        <Card><ErrorState onRetry={retry} /></Card>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {nurses.map((n) => {
            const count = patientsOf(n.id);
            const overRatio = count > SHIFT_RULE.patientsPerNurse;
            return (
              <section
                key={n.id}
                aria-label={n.name}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOver(n.id); }}
                onDragLeave={() => setOver((o) => (o === n.id ? null : o))}
                onDrop={(e) => {
                  e.preventDefault();
                  const bed = Number(e.dataTransfer.getData('text/plain'));
                  if (bed) move(bed, n.id);
                  setOver(null);
                  setDragBed(null);
                }}
                className={`flex flex-col rounded-card border-2 bg-surface ${over === n.id ? 'border-primary-600 bg-primary-50' : overRatio ? 'border-warning-border' : 'border-border-subtle'}`}
              >
                <div className="border-b border-border-subtle p-4">
                  <h2 className="text-lg font-semibold">{n.name}</h2>
                  <p className="text-sm text-ink-700">{t(`staffRole.${n.role}`)}</p>
                  <p className="mt-2 text-sm font-semibold tabular-nums">{t('assignBeds.count', { n: count, max: SHIFT_RULE.patientsPerNurse })}</p>
                  {overRatio && <div className="mt-2"><Chip tone="warning" icon={TriangleAlert}>{t('staff.overRatio', { n: count, max: SHIFT_RULE.patientsPerNurse })}</Chip></div>}
                </div>
                <ul className="flex min-h-40 flex-1 flex-col gap-2 p-3">
                  {draft[n.id].length === 0 && <li className="rounded-control border border-dashed border-border-input p-4 text-center text-sm text-ink-500">{t('assignBeds.dropHere')}</li>}
                  {draft[n.id].map((bedId) => {
                    const bed = beds.find((b) => b.id === bedId)!;
                    const patient = PATIENTS.find((p) => p.id === bed.patientId);
                    const moved = ownerOf(saved, bedId) !== n.id;
                    return (
                      <li
                        key={bedId}
                        draggable
                        onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(bedId)); e.dataTransfer.effectAllowed = 'move'; setDragBed(bedId); }}
                        onDragEnd={() => { setDragBed(null); setOver(null); }}
                        aria-label={t('common.bed', { n: bedId })}
                        className={`flex cursor-grab items-center gap-2 rounded-control border bg-surface p-2 active:cursor-grabbing ${dragBed === bedId ? 'opacity-50' : ''} ${moved ? 'border-primary-600' : 'border-border-subtle'}`}
                      >
                        <GripVertical size={16} aria-hidden className="shrink-0 text-ink-500" />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="whitespace-nowrap font-semibold tabular-nums">{t('common.bed', { n: bedId })}</span>
                            <BedStatusChip status={bed.status} />
                          </span>
                          <span className="block truncate text-sm text-ink-700">{patient?.name ?? t('bedmap.noPatient')}</span>
                        </span>
                        <label className="shrink-0">
                          <span className="sr-only">{t('assignBeds.moveTo', { bed: bedId })}</span>
                          <select
                            value={n.id}
                            onChange={(e) => move(bedId, e.target.value)}
                            className="h-10 max-w-28 rounded-control border border-border-input bg-surface px-2 text-sm"
                          >
                            {nurses.map((o) => <option key={o.id} value={o.id}>{o.name.replace(/^(Nurse|Sister)\s+/, '')}</option>)}
                          </select>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
      <p className="mt-4 text-sm text-ink-500">{t('assignBeds.help')}</p>
    </>
  );
}
