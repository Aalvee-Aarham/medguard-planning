import { useEffect, useRef } from 'react'
import { gsap, ScrollTrigger, useGSAP, MOTION_OK } from '../lib/motion'

/**
 * Simple blue line illustrations: allowed only in empty states and onboarding (theme prompt, section 2).
 * Layers marked data-depth drift at different speeds while the page scrolls (README: parallax on empty states).
 */
export function EmptyArt({ kind }: { kind: 'docs' | 'pills' | 'chat' | 'people' | 'bell' | 'search' }) {
  const ref = useRef<SVGSVGElement>(null)
  useParallax(ref)
  const s = { fill: 'none', stroke: 'var(--color-primary-600)', strokeWidth: 3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const soft = { ...s, stroke: 'var(--color-primary-100)' }
  return (
    <svg ref={ref} viewBox="0 0 160 112" width="160" height="112" aria-hidden>
      <g data-depth="0.4">
        <circle cx="80" cy="58" r="46" fill="var(--color-primary-50)" />
      </g>
      <g data-depth="1">
        {kind === 'docs' && (
          <>
            <rect x="48" y="22" width="52" height="68" rx="6" {...soft} />
            <rect x="60" y="16" width="52" height="68" rx="6" {...s} fill="#fff" />
            <path d="M70 34h32M70 44h32M70 54h20" {...s} />
          </>
        )}
        {kind === 'pills' && (
          <>
            <rect x="44" y="40" width="72" height="30" rx="15" {...s} fill="#fff" transform="rotate(-20 80 55)" />
            <path d="M80 40v30" {...s} transform="rotate(-20 80 55)" />
          </>
        )}
        {kind === 'chat' && (
          <>
            <path d="M44 26h56a8 8 0 0 1 8 8v26a8 8 0 0 1-8 8H66l-14 12V68h-8a8 8 0 0 1-8-8V34a8 8 0 0 1 8-8z" {...s} fill="#fff" />
            <path d="M56 44h32M56 54h20" {...s} />
          </>
        )}
        {kind === 'people' && (
          <>
            <circle cx="64" cy="44" r="12" {...s} fill="#fff" />
            <circle cx="98" cy="48" r="10" {...soft} />
            <path d="M40 86c2-16 12-24 24-24s22 8 24 24M82 86c2-12 8-18 16-18s14 6 16 18" {...s} />
          </>
        )}
        {kind === 'bell' && (
          <>
            <path d="M60 74V52a20 20 0 0 1 40 0v22l8 8H52z" {...s} fill="#fff" />
            <path d="M74 88a6 6 0 0 0 12 0" {...s} />
          </>
        )}
        {kind === 'search' && (
          <>
            <circle cx="74" cy="50" r="22" {...s} fill="#fff" />
            <path d="M90 66l18 18" {...s} />
          </>
        )}
      </g>
    </svg>
  )
}

export function useParallax(ref: React.RefObject<Element | null>) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        const el = ref.current
        if (!el) return
        el.querySelectorAll<SVGGElement>('[data-depth]').forEach((layer) => {
          const d = Number(layer.dataset.depth)
          gsap.fromTo(layer, { y: 10 * d }, { y: -10 * d, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } })
        })
      })
      return () => mm.revert()
    },
    { scope: ref },
  )
}

/** Mock document "photo": a paper sheet drawn from a seed. No text inside images (theme prompt section 8). */
export function DocThumb({ seed, className, rotate = true }: { seed: number; className?: string; rotate?: boolean }) {
  const lines = Array.from({ length: 9 }, (_, i) => 30 + ((seed * 37 + i * 53) % 55))
  const r = rotate ? (((seed * 7) % 5) - 2) * 0.8 : 0
  return (
    <svg viewBox="0 0 120 160" className={className} role="img" aria-label="Document page" style={{ transform: `rotate(${r}deg)` }}>
      <rect x="2" y="2" width="116" height="156" rx="6" fill="#fff" stroke="var(--color-border-subtle)" strokeWidth="2" />
      <rect x="14" y="14" width="40" height="8" rx="2" fill="var(--color-primary-100)" />
      {lines.map((w, i) => (
        <rect key={i} x="14" y={34 + i * 12} width={w} height="4" rx="2" fill="var(--color-border-subtle)" />
      ))}
      <rect x="70" y="128" width="36" height="14" rx="3" fill="none" stroke="var(--color-primary-100)" strokeWidth="2" />
    </svg>
  )
}

/** Animates a number up from 0 once (stat counters in the README). Text is correct before and after. */
export function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const mm = gsap.matchMedia()
    mm.add(MOTION_OK, () => {
      const o = { v: 0 }
      gsap.to(o, { v: value, duration: 0.6, onUpdate: () => (el.textContent = o.v.toFixed(decimals)) })
    })
    return () => mm.revert()
  }, [value, decimals])
  return <span ref={ref}>{value.toFixed(decimals)}</span>
}

export { ScrollTrigger }
