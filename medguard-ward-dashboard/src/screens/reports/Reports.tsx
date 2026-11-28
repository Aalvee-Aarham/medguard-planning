// D19 Reports: pilot metrics before vs after (bed turnover, doses on time, fall response time).
// Each metric has its own chart (one axis each, never a dual axis), a weekly table, and Export CSV / PDF.
// CSV is a Blob download; PDF uses the browser's print dialog with a print stylesheet (no PDF library).
import { ArrowDownRight, ArrowUpRight, BedDouble, Clock, Download, Printer, Siren, type LucideIcon } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, PageHeader } from '../../components/PageHeader';
import { ErrorState, Skeleton } from '../../components/States';
import { average, pilotWeeks, type WeekPoint } from '../../mock/incidents';
import { useStore, useT } from '../../state/store';
import { formatDate } from '../../utils/format';
import { useDuration, useMockLoad } from '../../utils/hooks';

type Key = 'turnoverHours' | 'onTimePct' | 'fallResponseSecs';
const METRICS: { key: Key; icon: LucideIcon; better: 'down' | 'up' }[] = [
  { key: 'turnoverHours', icon: BedDouble, better: 'down' },
  { key: 'onTimePct', icon: Clock, better: 'up' },
  { key: 'fallResponseSecs', icon: Siren, better: 'down' },
];
const AXIS = { fill: '#475467', fontSize: 14 };

function useFormat() {
  const t = useT();
  const dur = useDuration();
  return (key: Key, v: number) => (key === 'turnoverHours' ? t('report.hours', { n: v }) : key === 'onTimePct' ? `${v}%` : dur(Math.round(v)));
}

interface TipProps { active?: boolean; payload?: { payload: WeekPoint }[]; label?: string | number; metric: Key }

function WeekTooltip({ active, payload, label, metric }: TipProps) {
  const t = useT();
  const fmt = useFormat();
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-control border border-border-subtle bg-surface p-3 text-sm shadow-float">
      <p className="font-semibold">{label} · {t(p.pilot ? 'report.with' : 'report.before')}</p>
      <p className="tabular-nums">{fmt(metric, p[metric])}</p>
    </div>
  );
}

function downloadCsv(rows: WeekPoint[]) {
  const head = 'week,period,bed_turnover_hours,doses_on_time_pct,fall_response_seconds';
  const body = rows.map((r) => [r.week, r.pilot ? 'with MedGuard' : 'before', r.turnoverHours, r.onTimePct, r.fallResponseSecs].join(','));
  const blob = new Blob([[head, ...body].join('\n') + '\n'], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'medguard-pilot-neuro-ward-b.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function Reports() {
  const { ward, lang, logAudit, toast } = useStore();
  const t = useT();
  /** Short axis labels with units: "12 h", "93%", "5 min". */
  const axisTick = (key: Key, v: number) =>
    key === 'turnoverHours' ? t('report.hours', { n: v }) : key === 'onTimePct' ? `${v}%` : t('report.minutes', { n: Math.round(v / 60) });
  const fmt = useFormat();
  const { loading, error, retry } = useMockLoad();
  const weeks = pilotWeeks();
  const before = weeks.filter((w) => !w.pilot);
  const after = weeks.filter((w) => w.pilot);

  const exportCsv = () => { downloadCsv(weeks); logAudit('Exported pilot report (CSV)', ''); toast(t('report.csvToast')); };
  const exportPdf = () => { logAudit('Exported pilot report (PDF)', ''); window.print(); };

  return (
    <>
      <PageHeader
        title={t('screen.D19.title')}
        subtitle={t('report.subtitle', { ward: ward.name, date: formatDate(new Date().toISOString()) })}
        actions={
          <div className="flex gap-2 print:hidden">
            <button type="button" onClick={exportCsv} className="btn-secondary"><Download size={16} aria-hidden /> {t('report.csv')}</button>
            <button type="button" onClick={exportPdf} className="btn-primary"><Printer size={16} aria-hidden /> {t('report.pdf')}</button>
          </div>
        }
      />

      {loading ? <Skeleton className="h-96" /> : error ? <Card><ErrorState onRetry={retry} /></Card> : (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-6 print:grid-cols-3">
            {METRICS.map(({ key, icon: Icon, better }) => {
              const b = average(before, key);
              const a = average(after, key);
              const change = Math.round(((a - b) / b) * 100);
              const improved = better === 'down' ? a < b : a > b;
              const Arrow = a < b ? ArrowDownRight : ArrowUpRight;
              return (
                <Card key={key} className="break-inside-avoid">
                  <div className="space-y-4 p-4">
                    <p className="flex items-center gap-2 text-sm text-ink-700">
                      <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-bg"><Icon size={20} strokeWidth={1.75} /></span>
                      {t(`report.metric.${key}`)}
                    </p>
                    <div className="flex items-end gap-6">
                      <div>
                        <p className="text-sm text-ink-500">{t('report.before')}</p>
                        <p className="text-xl font-semibold tabular-nums text-ink-700">{fmt(key, b)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-ink-500">{t('report.with')}</p>
                        <p className="text-[28px] font-bold leading-9 tabular-nums">{fmt(key, a)}</p>
                      </div>
                    </div>
                    <p className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-sm font-semibold ${improved ? 'border-success-border bg-success-bg text-success-text' : 'border-danger-border bg-danger-bg text-danger-text'}`}>
                      <Arrow size={16} aria-hidden /> {t(improved ? 'report.better' : 'report.worse', { n: Math.abs(change) })}
                    </p>
                    <div className="h-40" aria-hidden>
                      <ResponsiveContainer width="100%" height="100%" key={lang}>
                        <LineChart data={weeks} margin={{ top: 24, right: 12, bottom: 0, left: 0 }}>
                          <CartesianGrid stroke="#E3E9F1" vertical={false} />
                          <XAxis dataKey="week" tick={AXIS} axisLine={false} tickLine={false} interval={1} />
                          <YAxis tick={AXIS} axisLine={false} tickLine={false} width={52} domain={['auto', 'auto']} tickFormatter={(v: number) => axisTick(key, v)} />
                          <ReferenceLine x="W5" stroke="#7B8BA1" strokeDasharray="4 4" label={{ value: t('report.pilotStart'), position: 'top', fill: '#475467', fontSize: 12 }} />
                          <Tooltip content={<WeekTooltip metric={key} />} cursor={{ stroke: '#7B8BA1' }} />
                          <Line type="monotone" dataKey={key} stroke="#1D5FBF" strokeWidth={2} dot={{ r: 4, fill: '#1D5FBF', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card title={t('report.weekly')} className="break-inside-avoid">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">{t('report.weekly')}</caption>
              <thead>
                <tr className="h-12 border-b border-border-subtle text-left text-ink-700">
                  <th scope="col" className="px-4 font-semibold">{t('report.week')}</th>
                  <th scope="col" className="px-4 font-semibold">{t('report.period')}</th>
                  {METRICS.map(({ key }) => <th key={key} scope="col" className="px-4 text-right font-semibold">{t(`report.metric.${key}`)}</th>)}
                </tr>
              </thead>
              <tbody>
                {weeks.map((w) => (
                  <tr key={w.week} className={`h-12 border-b border-border-subtle ${w.week === 'W5' ? 'border-t-2 border-t-border-input' : ''}`}>
                    <th scope="row" className="px-4 text-left font-semibold tabular-nums">{w.week}</th>
                    <td className="px-4">{t(w.pilot ? 'report.with' : 'report.before')}</td>
                    {METRICS.map(({ key }) => <td key={key} className="px-4 text-right tabular-nums">{fmt(key, w[key])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <p className="text-sm text-ink-500">{t('report.note')}</p>
        </div>
      )}
    </>
  );
}
