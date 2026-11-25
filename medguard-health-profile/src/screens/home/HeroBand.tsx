import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { CountUp } from '../../components/art'
import { gsap, useGSAP, MOTION_OK, prefersReduced } from '../../lib/motion'

type Tone = 'primary' | 'danger' | 'success'
interface Stat {
  icon: LucideIcon
  value: number
  label: string
  tone: Tone
  hideValue?: boolean
}
interface Quick {
  to: string
  icon: LucideIcon
  label: string
}

const TONE: Record<Tone, string> = {
  primary: 'text-primary-700 bg-primary-50 ring-primary-100',
  danger: 'text-danger-text bg-danger-bg ring-danger-border',
  success: 'text-success-text bg-success-bg ring-success-border',
}

/** One heartbeat, repeated across the band. Drawn in a 1200 x 120 box. */
const ECG = (() => {
  let d = 'M0,70'
  for (let x = 0; x < 1200; x += 300) {
    d += ` L${x + 120},70 L${x + 135},62 L${x + 150},70 L${x + 165},70 L${x + 175},84 L${x + 190},18 L${x + 205},100 L${x + 218},70 L${x + 245},70 L${x + 262},58 L${x + 282},70 L${x + 300},70`
  }
  return d
})()

/**
 * Home greeting band. Aurora blobs drift behind frosted glass; a soft glow follows the pointer;
 * a heartbeat line traces itself across the band; the greeting rises word by word.
 * The next-dose card (children) sits in glass but is never animated (safety rule).
 */
export function HeroBand({
  refEl,
  dateLabel,
  hello,
  name,
  sub,
  stats,
  quick,
  quickLabel,
  children,
}: {
  refEl: RefObject<HTMLDivElement | null>
  dateLabel: string
  hello: string
  name: string
  sub: string
  stats: Stat[]
  quick: Quick[]
  quickLabel: string
  children: ReactNode
}) {
  const ecg = useRef<SVGPathElement>(null)
  const [time, setTime] = useState(() => new Date())

  // Live clock, ticks on the minute
  useEffect(() => {
    const id = window.setInterval(() => setTime(new Date()), 15000)
    return () => window.clearInterval(id)
  }, [])

  // Pointer glow: write CSS vars straight to the element, no React renders
  useEffect(() => {
    const el = refEl.current
    if (!el || !window.matchMedia('(hover: hover)').matches) return
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      el.style.setProperty('--hx', `${e.clientX - r.left}px`)
      el.style.setProperty('--hy', `${e.clientY - r.top}px`)
    }
    el.addEventListener('pointermove', move)
    return () => el.removeEventListener('pointermove', move)
  }, [refEl])

  // Heartbeat trace: anime.js draws a short bright segment that sweeps along the line, forever
  useEffect(() => {
    const el = ecg.current
    if (!el || prefersReduced()) return
    let stop: (() => void) | undefined
    let dead = false
    import('animejs').then(({ svg, animate }) => {
      if (dead) return
      const [line] = svg.createDrawable(el)
      const a = animate(line, { draw: ['0 0.08', '0.92 1'], duration: 5200, ease: 'linear', loop: true })
      stop = () => a.pause()
    })
    return () => {
      dead = true
      stop?.()
    }
  }, [])

  // Entrance: words rise out of a mask, then stats and pills fan in. Not the dose card.
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
        tl.from('[data-word]', { yPercent: 110, duration: 0.7, stagger: 0.06 })
          .from('[data-hero-fade]', { opacity: 0, y: 10, duration: 0.5, stagger: 0.06 }, '-=0.45')
          .from('[data-pill]', { opacity: 0, y: 14, scale: 0.94, duration: 0.45, stagger: 0.05, clearProps: 'transform' }, '-=0.35')
      })
      return () => mm.revert()
    },
    { scope: refEl },
  )

  const words = `${hello},`.split(' ')
  const hh = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div ref={refEl} className="hero-aurora relative overflow-hidden border-b border-border-subtle">
      {/* Backdrop: drifting colour, dot grid, ECG trace, pointer glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div data-depth="0.5" className="absolute -top-24 right-[8%] size-[420px]">
          <span className="blob blob-a inset-0" />
        </div>
        <div data-depth="1.1" className="absolute top-10 right-[34%] size-[300px]">
          <span className="blob blob-b inset-0" />
        </div>
        <div data-depth="0.8" className="absolute -bottom-32 -left-20 size-[380px]">
          <span className="blob blob-c inset-0" />
        </div>
        <div className="hero-grid absolute inset-0" />
        <svg className="absolute inset-x-0 bottom-3 h-24 w-full md:bottom-6" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d={ECG} fill="none" stroke="var(--color-primary-100)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          <path ref={ecg} d={ECG} fill="none" stroke="var(--color-primary-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity="0.55" />
        </svg>
        <div className="hero-glow absolute inset-0" />
      </div>

      <div className="relative mx-auto flex max-w-[1400px] flex-col gap-6 px-4 pt-6 pb-8 md:px-6 lg:flex-row lg:items-center lg:gap-10 lg:px-8 lg:py-10">
        <div className="min-w-0 flex-1">
          <p data-hero-fade className="glass inline-flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-small text-ink-700">
            <span className="rounded-full bg-primary-600 px-2 py-0.5 text-caption font-semibold text-white tabular">{hh}</span>
            {dateLabel}
          </p>

          <h1 className="mt-4 text-display leading-tight font-bold tracking-tight lg:text-[calc(44px*var(--ts))] lg:leading-[1.1]">
            {words.map((w, i) => (
              <span key={i} className="inline-block overflow-hidden pb-1 align-bottom">
                <span data-word className="inline-block">
                  {w}&nbsp;
                </span>
              </span>
            ))}
            <span className="inline-block overflow-hidden pb-1 align-bottom">
              <span data-word className="text-gradient inline-block">
                {name}
              </span>
            </span>
          </h1>
          <p data-hero-fade className="mt-1 text-body text-ink-700">
            {sub}
          </p>

          <ul data-hero-fade className="mt-4 flex flex-wrap gap-2" aria-label={sub}>
            {stats.map((x) => (
              <li key={x.label} className={`inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-small font-semibold ring-1 ${TONE[x.tone]}`}>
                <x.icon className="size-4" strokeWidth={2} aria-hidden />
                {!x.hideValue && (
                  <span className="tabular">
                    <CountUp value={x.value} />
                  </span>
                )}
                <span className="font-medium">{x.label}</span>
              </li>
            ))}
          </ul>

          <nav aria-label={quickLabel} className="no-scrollbar -mx-1 mt-6 flex gap-3 overflow-x-auto px-1 pt-1 pb-3">
            {quick.map((q) => (
              <Link
                key={q.to}
                to={q.to}
                data-pill
                className="glass glass-pill inline-flex min-h-12 shrink-0 items-center gap-3 rounded-2xl py-2 pr-4 pl-2 text-small font-semibold text-ink-900 hover:text-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
              >
                <span className="pill-icon grid size-9 place-items-center rounded-xl text-white">
                  <q.icon className="size-[18px]" strokeWidth={2} aria-hidden />
                </span>
                {q.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="w-full lg:w-[400px] lg:shrink-0">{children}</div>
      </div>
    </div>
  )
}
