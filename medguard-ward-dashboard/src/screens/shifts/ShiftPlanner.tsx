// D14 Shift planner: week grid (nurses × days), AI-proposed plan, warnings when the ratio or rest rule breaks
// (danger chip on the cell), drag to change, Publish with confirm + note. AI drafts, a person confirms.
import { CalendarCheck, GripVertical, Sparkles, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Chip } from '../../components/Chips';
import { Card, PageHeader } from '../../components/PageHeader';
import { ReasonDialog } from '../../components/ReasonDialog';
import { EmptyState, ErrorState, TableSkeleton } from '../../components/States';
import { MIN_REST_HOURS, PATIENTS_PER_NURSE, ROSTER, SHIFTS, checkPlan, dayDate, nursesNeeded, proposePlan, rosterName, type Warning } from '../../mock/shifts';
import type { ShiftCode } from '../../mock/types';
import { useStore, useT } from '../../state/store';
import { formatTime } from '../../utils/format';
import { useMockLoad } from '../../utils/hooks';

const CODES: ShiftCode[] = ['M', 'E', 'N', 'off'];
const day = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

export function useWarningText() {
  const t = useT();
  return (w: Warning, weekStart: string) =>
    w.kind === 'rest'
      ? t('shifts.warn.rest', {
          name: rosterName(w.nurseId), hours: w.hours, min: MIN_REST_HOURS,
          from: `${t(`shift.${w.from}`)} ${day(dayDate(weekStart, w.day - 1))}`, to: `${t(`shift.${w.to}`)} ${day(dayDate(weekStart, w.day))}`,
        })
      : t('shifts.warn.cover', { shift: t(`shift.${w.shift}`), day: day(dayDate(weekStart, w.day)), have: w.have, need: w.need, ratio: PATIENTS_PER_NURSE });
}

export function ShiftPlanner() {
  const { shiftPlan: plan, swaps, beds, serverDown, user, dispatch, logAudit, toast } = useStore();
  const t = useT();
  const warnText = useWarningText();
  const { loading, error, retry } = useMockLoad();
  const [drag, setDrag] = useState<{ id: string; d: number } | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const patients = beds.filter((b) => b.status === 'occupied').length;
  const need = nursesNeeded(patients);
  const warnings = plan ? checkPlan(plan.cells, patients) : [];
  const openSwaps = swaps.filter((s) => s.status === 'open').length;

  const propose = () => {
    const cells = proposePlan(patients);
    dispatch({ type: 'plan-set', cells, aiProposed: true });
    logAudit('AI proposed a shift plan', '');
    toast(t('shifts.proposedToast', { n: checkPlan(cells, patients).length }));
  };

  const setCell = (id: string, d: number, code: ShiftCode) => {
    if (!plan) return;
    const cells = structuredClone(plan.cells);
    cells[id][d] = code;
    dispatch({ type: 'plan-set', cells });
  };

  const swapCells = (a: { id: string; d: number }, b: { id: string; d: number }) => {
    if (!plan || (a.id === b.id && a.d === b.d)) return;
    const cells = structuredClone(plan.cells);
    [cells[a.id][a.d], cells[b.id][b.d]] = [cells[b.id][b.d], cells[a.id][a.d]];
    dispatch({ type: 'plan-set', cells });
  };

  const publish = (note: string) => {
    dispatch({ type: 'plan-publish', at: new Date().toISOString(), by: user.name, note });
    logAudit(`Published shift plan for week of ${day(new Date(plan!.weekStart))} (${warnings.length} warnings left)`, note);
    toast(t('shifts.publishedToast', { n: ROSTER.length }));
    setPublishing(false);
  };

  const status = !plan ? null : plan.status === 'published' && !plan.changedSincePublish ? (
    <Chip tone="success" icon={CalendarCheck}>{t('shifts.published', { time: formatTime(plan.publishedAt!), by: plan.publishedBy! })}</Chip>
  ) : plan.changedSincePublish ? (
    <Chip tone="warning" icon={TriangleAlert}>{t('shifts.changed')}</Chip>
  ) : (
    <Chip tone="primary" icon={Sparkles}>{plan.aiProposed ? t('shifts.draftAi') : t('shifts.draft')}</Chip>
  );

  return (
    <>
      <PageHeader
        title={t('screen.D14.title')}
        subtitle={plan ? t('shifts.subtitle', { week: day(new Date(plan.weekStart)), need, ratio: PATIENTS_PER_NURSE, rest: MIN_REST_HOURS }) : t('shifts.subtitleEmpty', { rest: MIN_REST_HOURS, ratio: PATIENTS_PER_NURSE })}
        actions={
          <>
            <Link to="/shifts/swaps" className="btn-secondary">
              {t('screen.D15.title')}
              {openSwaps > 0 && <span className="rounded-full bg-primary-600 px-2 text-sm text-surface tabular-nums">{openSwaps}</span>}
            </Link>
            {plan && <button type="button" onClick={propose} className="btn-secondary"><Sparkles size={16} aria-hidden /> {t('shifts.askAgain')}</button>}
            {plan && (
              <button
                type="button"
                disabled={serverDown || (plan.status === 'published' && !plan.changedSincePublish)}
                title={serverDown ? t('common.paused') : undefined}
                onClick={() => setPublishing(true)}
                className="btn-primary"
              >
                <CalendarCheck size={16} aria-hidden /> {t('shifts.publish')}
              </button>
            )}
          </>
        }
      />

      {loading ? <Card><TableSkeleton rows={8} /></Card> : error ? <Card><ErrorState onRetry={retry} /></Card> : !plan ? (
        <Card>
          <EmptyState
            title={t('shifts.emptyTitle')}
            body={t('shifts.emptyBody')}
            action={<button type="button" onClick={propose} className="btn-primary"><Sparkles size={16} aria-hidden /> {t('shifts.propose')}</button>}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            {status}
            {plan.aiProposed && plan.status === 'draft' && <span className="text-sm text-ink-700">{t('shifts.aiNote')}</span>}
          </div>

          {warnings.length > 0 ? (
            <section role="alert" className="rounded-card border border-danger-border bg-danger-bg p-4">
              <h2 className="flex items-center gap-2 font-semibold text-danger-text"><TriangleAlert size={20} aria-hidden /> {t('shifts.warnings', { n: warnings.length })}</h2>
              <ul className="mt-2 list-disc space-y-1 pl-8 text-sm">{warnings.map((w, i) => <li key={i}>{warnText(w, plan.weekStart)}</li>)}</ul>
            </section>
          ) : (
            <p role="status" className="rounded-card border border-success-border bg-success-bg p-4 font-semibold text-success-text">{t('shifts.noWarnings')}</p>
          )}

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">{t('screen.D14.title')}</caption>
                <thead className="bg-surface">
                  <tr className="h-12 text-left text-ink-700">
                    <th scope="col" className="sticky left-0 bg-surface px-3 font-semibold">{t('shifts.nurse')}</th>
                    {Array.from({ length: 7 }, (_, d) => (
                      <th key={d} scope="col" className="px-2 font-semibold whitespace-nowrap tabular-nums">{day(dayDate(plan.weekStart, d))}</th>
                    ))}
                    <th scope="col" className="px-3 text-right font-semibold">{t('shifts.total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {ROSTER.map((r) => (
                    <tr key={r.id} className="border-t border-border-subtle">
                      <th scope="row" className="sticky left-0 bg-surface px-3 py-2 text-left font-semibold whitespace-nowrap">{r.name}</th>
                      {plan.cells[r.id].map((code, d) => {
                        const warn = warnings.find((w) => w.kind === 'rest' && w.nurseId === r.id && w.day === d);
                        const key = `${r.id}-${d}`;
                        return (
                          <td key={d} className="p-1">
                            <div
                              draggable
                              onDragStart={(e) => { e.dataTransfer.setData('text/plain', key); e.dataTransfer.effectAllowed = 'move'; setDrag({ id: r.id, d }); }}
                              onDragEnd={() => { setDrag(null); setOver(null); }}
                              onDragOver={(e) => { e.preventDefault(); setOver(key); }}
                              onDragLeave={() => setOver((o) => (o === key ? null : o))}
                              onDrop={(e) => { e.preventDefault(); if (drag) swapCells(drag, { id: r.id, d }); setDrag(null); setOver(null); }}
                              title={warn ? warnText(warn, plan.weekStart) : undefined}
                              className={`flex min-w-[112px] items-center gap-1 rounded-control border p-1 ${
                                warn ? 'border-2 border-danger-text bg-danger-bg' : over === key ? 'border-primary-600 bg-primary-50' : code === 'off' ? 'border-border-subtle bg-neutral-bg' : 'border-primary-100 bg-primary-50'
                              } ${drag?.id === r.id && drag.d === d ? 'opacity-50' : ''}`}
                            >
                              <GripVertical size={14} aria-hidden className="shrink-0 cursor-grab text-ink-500" />
                              {warn && <TriangleAlert size={14} aria-hidden className="shrink-0 text-danger-text" />}
                              <select
                                aria-label={t('shifts.cellLabel', { name: r.name, day: day(dayDate(plan.weekStart, d)) })}
                                aria-invalid={!!warn}
                                value={code}
                                onChange={(e) => setCell(r.id, d, e.target.value as ShiftCode)}
                                className={`h-8 w-full min-w-0 rounded-[6px] bg-transparent text-sm font-semibold ${warn ? 'text-danger-text' : code === 'off' ? 'text-ink-500' : 'text-primary-700'}`}
                              >
                                {CODES.map((c) => <option key={c} value={c}>{t(`shift.${c}`)}</option>)}
                              </select>
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-3 text-right tabular-nums">{plan.cells[r.id].filter((c) => c !== 'off').length}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  {SHIFTS.map((s) => (
                    <tr key={s} className="border-t border-border-subtle bg-page">
                      <th scope="row" className="sticky left-0 bg-page px-3 py-2 text-left font-semibold whitespace-nowrap">{t('shifts.cover', { shift: t(`shift.${s}`) })}</th>
                      {Array.from({ length: 7 }, (_, d) => {
                        const have = Object.values(plan.cells).filter((w) => w[d] === s).length;
                        const short = have < need;
                        return (
                          <td key={d} className={`px-2 py-2 tabular-nums ${short ? 'font-semibold text-danger-text' : 'text-ink-700'}`}>
                            {short && <TriangleAlert size={14} aria-hidden className="mr-1 inline" />}
                            {t('shifts.coverCount', { have, need })}
                          </td>
                        );
                      })}
                      <td />
                    </tr>
                  ))}
                </tfoot>
              </table>
            </div>
          </Card>
          <p className="text-sm text-ink-500">{t('shifts.help', { m: t('shiftTime.M'), e: t('shiftTime.E'), n: t('shiftTime.N') })}</p>
        </div>
      )}

      <ReasonDialog
        open={publishing}
        title={plan ? t('shifts.publishTitle', { week: day(new Date(plan.weekStart)) }) : ''}
        body={t(warnings.length ? 'shifts.publishBodyWarn' : 'shifts.publishBody', { n: ROSTER.length, w: warnings.length })}
        reasonLabel={t('shifts.noteLabel')}
        reasonHelp={t('shifts.noteHelp')}
        actionLabel={t('shifts.publish')}
        onCancel={() => setPublishing(false)}
        onConfirm={publish}
      />
    </>
  );
}
