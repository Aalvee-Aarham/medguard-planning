import { useEffect, useRef } from 'react'
import { prefersReduced } from '../lib/motion'

/**
 * Success mark drawn with anime.js v4 (svg.createDrawable). Plays once, after the action has already
 * happened, so it never delays a safety action (README). Under reduced motion the mark is simply shown.
 */
export function CheckDraw({ size = 72, tone = 'success' }: { size?: number; tone?: 'success' | 'primary' }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    if (prefersReduced() || !ref.current) return
    let stop: (() => void) | undefined
    const root = ref.current
    import('animejs').then(({ animate, svg, createTimeline }) => {
      const [ring] = svg.createDrawable(root.querySelector('circle')!)
      const [tick] = svg.createDrawable(root.querySelector('path')!)
      const tl = createTimeline({ defaults: { ease: 'outQuad' } })
      tl.add(ring, { draw: ['0 0', '0 1'], duration: 320 }).add(tick, { draw: ['0 0', '0 1'], duration: 220 }, '-=80')
      const pop = animate(root, { scale: [0.9, 1], duration: 300, ease: 'outBack(2)' })
      stop = () => {
        tl.revert()
        pop.revert()
      }
    })
    return () => stop?.()
  }, [])
  const c = tone === 'success' ? 'var(--color-success-text)' : 'var(--color-primary-600)'
  return (
    <svg ref={ref} viewBox="0 0 72 72" width={size} height={size} aria-hidden>
      <circle cx="36" cy="36" r="32" fill="none" stroke={c} strokeWidth="4" />
      <path d="M22 37l10 10 18-20" fill="none" stroke={c} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** The MedGuard mark (shield + cross), drawn stroke by stroke on the splash with anime.js */
export function LogoDraw({ size = 96 }: { size?: number }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    if (prefersReduced() || !ref.current) return
    let stop: (() => void) | undefined
    const root = ref.current
    import('animejs').then(({ svg, createTimeline, stagger }) => {
      const parts = svg.createDrawable(root.querySelectorAll('path'))
      const tl = createTimeline({ defaults: { ease: 'inOutQuad' } })
      tl.add(parts, { draw: ['0 0', '0 1'], duration: 600, delay: stagger(180) })
      stop = () => tl.revert()
    })
    return () => stop?.()
  }, [])
  return (
    <svg ref={ref} viewBox="0 0 96 96" width={size} height={size} role="img" aria-label="MedGuard">
      <rect width="96" height="96" rx="22" fill="var(--color-primary-600)" />
      <path d="M48 18 26 27v19c0 16 10 27 22 32 12-5 22-16 22-32V27z" fill="none" stroke="#fff" strokeWidth="5" strokeLinejoin="round" />
      <path d="M48 37v22" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      <path d="M37 48h22" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
    </svg>
  )
}
