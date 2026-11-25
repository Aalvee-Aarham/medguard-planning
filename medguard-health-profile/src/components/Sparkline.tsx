import { useEffect, useId, useRef } from 'react'
import { prefersReduced } from '../lib/motion'
import { fmtDate } from '../lib/format'

/**
 * Small trend line: normal range as a primary-50 band, line in primary-600, last point red when out of range.
 * The line draws itself once with anime.js (svg.createDrawable); under reduced motion it is simply shown.
 */
export function Sparkline({
  points, low, high, unit, height = 56, showLabels = false, className,
}: {
  points: { date: string; value: number }[]
  low: number
  high: number
  unit: string
  height?: number
  showLabels?: boolean
  className?: string
}) {
  const path = useRef<SVGPathElement>(null)
  const area = useRef<SVGPathElement>(null)
  const gid = useId().replace(/:/g, '')
  const W = 240
  const H = height
  const pad = { t: showLabels ? 18 : 8, b: showLabels ? 18 : 6, l: 6, r: 10 }
  const vals = points.map((p) => p.value)
  const min = Math.min(low, ...vals)
  const max = Math.max(high, ...vals)
  const span = max - min || 1
  const x = (i: number) => pad.l + (i / Math.max(points.length - 1, 1)) * (W - pad.l - pad.r)
  const y = (v: number) => pad.t + (1 - (v - min) / span) * (H - pad.t - pad.b)
  // smooth curve through the points (monotone-ish cubic)
  const d = points
    .map((p, i) => {
      if (i === 0) return `M${x(0)},${y(p.value)}`
      const px = x(i - 1)
      const cx = (px + x(i)) / 2
      return `C${cx},${y(points[i - 1].value)} ${cx},${y(p.value)} ${x(i)},${y(p.value)}`
    })
    .join(' ')
  const last = points[points.length - 1]
  const out = last.value < low || last.value > high

  useEffect(() => {
    if (prefersReduced() || !path.current) return
    let stop: (() => void) | undefined
    const el = path.current
    import('animejs').then(({ svg, animate }) => {
      const [line] = svg.createDrawable(el)
      const a = animate(line, { draw: ['0 0', '0 1'], duration: 900, ease: 'outQuad' })
      const b = area.current ? animate(area.current, { opacity: [0, 1], duration: 600, delay: 400 }) : null
      stop = () => {
        a.revert()
        b?.revert()
      }
    })
    return () => stop?.()
  }, [points.length, last.value])

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      role="img"
      aria-label={`${points.map((p) => `${fmtDate(p.date)}: ${p.value} ${unit}`).join(', ')}. Normal ${low}–${high} ${unit}.`}
    >
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1D5FBF" stopOpacity="0.14" />
          <stop offset="1" stopColor="#1D5FBF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x={0} y={y(Math.min(high, max))} width={W} height={Math.max(y(Math.max(low, min)) - y(Math.min(high, max)), 0)} fill="#EAF2FD" />
      <path ref={area} d={`${d} L${x(points.length - 1)},${H - pad.b} L${x(0)},${H - pad.b} Z`} fill={`url(#${gid})`} />
      <path ref={path} d={d} fill="none" stroke="#1D5FBF" strokeWidth={2} strokeLinecap="round" />
      {points.map((p, i) => {
        const o = p.value < low || p.value > high
        const isLast = i === points.length - 1
        return isLast || (showLabels && o) ? <circle key={i} cx={x(i)} cy={y(p.value)} r={isLast ? 4 : 3} fill={o ? '#B42318' : '#1D5FBF'} stroke="#fff" strokeWidth={1.5} /> : null
      })}
      {showLabels && (
        <text x={x(points.length - 1)} y={y(last.value) - 8} textAnchor="end" fontSize={12} fontWeight={600} fill={out ? '#B42318' : '#174C99'}>
          {last.value}
        </text>
      )}
    </svg>
  )
}
