// D18 Dose compliance: on-time / late / missed doses by nurse, by drug and by time of day (bar charts + table).
// Colours are status colours (state, not series), always with an icon + word in the legend, a 2 px gap
// between segments, hover details, and the same numbers in a table (validated: CVD floor needs this relief).
import { CircleCheck, Clock, XCircle, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, PageHeader } from '../../components/PageHeader';
import { StatTile } from '../../components/StatTile';
import { ErrorState, Skeleton } from '../../components/States';
import { doseStats, type DoseCount } from '../../mock/incidents';
import { useStore, useT } from '../../state/store';
import { useMockLoad } from '../../utils/hooks';

type Group = 'byNurse' | 'byDrug' | 'byTime';
type Part = 'onTime' | 'late' | 'missed';

export const DOSE_PARTS: { key: Part; color: string; icon: LucideIcon }[] = [
  { key: 'onTime', color: '#17B26A', icon: CircleCheck },
  { key: 'late', color: '#F79009', icon: Clock },
  { key: 'missed', color: '#D92D20', icon: XCircle },
];
const AXIS = { fill: '#475467', fontSize: 14 };
const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);
const total = (d: DoseCount) => d.onTime + d.late + d.missed;

function Legend() {
  const t = useT();
  return (
    <ul className="flex flex-wrap gap-4 text-sm text-ink-700">
      {DOSE_PARTS.map(({ key, color, icon: Icon }) => (
        <li key={key} className="flex items-center gap-2">
          <span aria-hidden className="h-3 w-3 rounded-sm" style={{ background: color }} />
          <Icon size={16} aria-hidden /> {t(`dose.${key}`)}
        </li>
      ))}
    </ul>
  );
}

/** Props Recharts passes to a custom tooltip. */
interface TipProps<T> { active?: boolean; payload?: { payload: T }[]; label?: string | number }

function DoseTooltip({ active, payload, label }: TipProps<DoseCount>) {
  const t = useT();
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-control border border-border-subtle bg-surface p-3 text-sm shadow-float">
      <p className="mb-1 font-semibold">{label}</p>
      {DOSE_PARTS.map(({ key, color, icon: Icon }) => (
        <p key={key} className="flex items-center gap-2 tabular-nums">
          <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: color }} />
          <Icon size={14} aria-hidden /> {t(`dose.${key}`)}: <strong>{row[key]}</strong> ({pct(row[key], total(row))}%)
        </p>
      ))}
    </div>
  );
}

export function DoseCompliance() {
  const t = useT();
  const { lang } = useStore();
  const { loading, error, retry } = useMockLoad();
  const [days, setDays] = useState<7 | 28>(28);
  const [group, setGroup] = useState<Group>('byNurse');

  const stats = doseStats(days);
  const rows = stats[group];
  const all = stats.byNurse.reduce((s, r) => ({ onTime: s.onTime + r.onTime, late: s.late + r.late, missed: s.missed + r.missed }), { onTime: 0, late: 0, missed: 0 });
  const allTotal = all.onTime + all.late + all.missed;
  const horizontal = group !== 'byTime';
  const labelWidth = group === 'byDrug' ? 220 : 180;

  const seg = (c: string) => `h-10 rounded-[6px] px-3 text-sm font-semibold ${c}`;

  return (
    <>
      <PageHeader
        title={t('screen.D18.title')}
        subtitle={t('dose.subtitle')}
        actions={
          <div role="group" aria-label={t('dose.period')} className="flex rounded-control border border-border-input p-1">
            {([7, 28] as const).map((d) => (
              <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)} className={seg(days === d ? 'bg-primary-100 text-primary-700' : 'text-ink-700 hover:bg-page')}>
                {t('dose.lastDays', { n: d })}
              </button>
            ))}
          </div>
        }
      />

      {loading ? <Skeleton className="h-96" /> : error ? <Card><ErrorState onRetry={retry} /></Card> : (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-6">
            <StatTile label={t('dose.onTime')} value={`${pct(all.onTime, allTotal)}%`} icon={CircleCheck} trend={t('dose.ofDoses', { n: all.onTime, total: allTotal })} />
            <StatTile label={t('dose.late')} value={`${pct(all.late, allTotal)}%`} icon={Clock} trend={t('dose.ofDoses', { n: all.late, total: allTotal })} />
            <StatTile label={t('dose.missed')} value={all.missed} icon={XCircle} tone={all.missed ? 'danger' : 'neutral'} trend={t('dose.missedHint')} />
          </div>

          <Card
            title={t(`dose.title.${group}`)}
            action={
              <div role="group" aria-label={t('dose.groupBy')} className="flex rounded-control border border-border-input p-1">
                {(['byNurse', 'byDrug', 'byTime'] as Group[]).map((g) => (
                  <button key={g} type="button" aria-pressed={group === g} onClick={() => setGroup(g)} className={seg(group === g ? 'bg-primary-100 text-primary-700' : 'text-ink-700 hover:bg-page')}>
                    {t(`dose.group.${g}`)}
                  </button>
                ))}
              </div>
            }
          >
            <div className="space-y-4 p-4">
              <Legend />
              <div style={{ height: horizontal ? rows.length * 56 + 40 : 320 }} aria-hidden>
                <ResponsiveContainer width="100%" height="100%" key={`${group}-${days}-${lang}`}>
                  <BarChart data={rows} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 4, right: 16, bottom: 4, left: 4 }} barCategoryGap={horizontal ? 14 : '22%'}>
                    <CartesianGrid stroke="#E3E9F1" horizontal={!horizontal} vertical={horizontal} />
                    {horizontal ? (
                      <>
                        <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
                        <YAxis type="category" dataKey="label" width={labelWidth} tick={AXIS} axisLine={false} tickLine={false} />
                      </>
                    ) : (
                      <>
                        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
                        <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} width={40} />
                      </>
                    )}
                    <Tooltip content={<DoseTooltip />} cursor={{ fill: '#EAF2FD' }} />
                    {DOSE_PARTS.map(({ key, color }, i) => (
                      <Bar
                        key={key}
                        dataKey={key}
                        stackId="doses"
                        fill={color}
                        stroke="#FFFFFF"
                        strokeWidth={2}
                        isAnimationActive={false}
                        radius={i === DOSE_PARTS.length - 1 ? (horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]) : 0}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">{t(`dose.title.${group}`)}</caption>
                <thead>
                  <tr className="h-12 border-b border-border-subtle text-left text-ink-700">
                    <th scope="col" className="px-3 font-semibold">{t(`dose.group.${group}`)}</th>
                    {DOSE_PARTS.map(({ key }) => <th key={key} scope="col" className="px-3 text-right font-semibold">{t(`dose.${key}`)}</th>)}
                    <th scope="col" className="px-3 text-right font-semibold">{t('dose.total')}</th>
                    <th scope="col" className="px-3 text-right font-semibold">{t('dose.onTimePct')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.label} className="h-12 border-b border-border-subtle hover:bg-primary-50">
                      <th scope="row" className="px-3 text-left font-semibold">{r.label}</th>
                      {DOSE_PARTS.map(({ key }) => <td key={key} className="px-3 text-right tabular-nums">{r[key]}</td>)}
                      <td className="px-3 text-right tabular-nums">{total(r)}</td>
                      <td className="px-3 text-right font-semibold tabular-nums">{pct(r.onTime, total(r))}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
