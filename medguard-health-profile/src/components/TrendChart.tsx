import { Area, CartesianGrid, ComposedChart, LabelList, Line, ReferenceArea, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { fmtDate } from '../lib/format'

/** Line chart; normal range as a primary-50 band; out-of-range points red with their value (theme prompt) */
export function TrendChart({ points, low, high, unit, height = 'h-56' }: { points: { date: string; value: number }[]; low: number; high: number; unit: string; height?: string }) {
  const data = points.map((p) => ({ ...p, label: fmtDate(p.date).replace(/ \d{4}$/, ''), out: p.value < low || p.value > high }))
  const vals = points.map((p) => p.value)
  const min = Math.min(low, ...vals)
  const max = Math.max(high, ...vals)
  const pad = (max - min) * 0.2 || 1
  return (
    <div className={`${height} w-full`} role="img" aria-label={`Trend: ${points.map((p) => `${fmtDate(p.date)} ${p.value} ${unit}`).join(', ')}`}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 24, right: 24, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="tc-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1D5FBF" stopOpacity={0.28} />
              <stop offset="1" stopColor="#1D5FBF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E3E9F1" strokeDasharray="4 6" vertical={false} />
          <ReferenceArea y1={low} y2={high} fill="#EAF2FD" fillOpacity={1} />
          <XAxis dataKey="label" tick={{ fontSize: 14, fill: '#475467' }} tickLine={false} axisLine={{ stroke: '#E3E9F1' }} />
          <YAxis domain={[+(min - pad).toFixed(1), +(max + pad).toFixed(1)]} tick={{ fontSize: 14, fill: '#475467' }} tickLine={false} axisLine={false} width={44} />
          <Area dataKey="value" type="monotone" stroke="none" fill="url(#tc-fill)" isAnimationActive={false} />
          <Line
            dataKey="value"
            type="monotone"
            stroke="#1D5FBF"
            strokeWidth={3}
            isAnimationActive={false}
            dot={(p: { cx?: number; cy?: number; payload?: { out: boolean }; index?: number }) => (
              <circle key={p.index} cx={p.cx} cy={p.cy} r={p.payload?.out ? 6 : 4} fill={p.payload?.out ? '#B42318' : '#1D5FBF'} stroke="#fff" strokeWidth={2} />
            )}
          >
            <LabelList
              dataKey="value"
              content={(p: { x?: number | string; y?: number | string; value?: unknown; index?: number }) => {
                const d = data[p.index ?? 0]
                if (!d?.out) return null
                return (
                  <text x={Number(p.x)} y={Number(p.y) - 12} textAnchor="middle" fontSize={14} fontWeight={600} fill="#B42318">
                    {String(p.value)}
                  </text>
                )
              }}
            />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
