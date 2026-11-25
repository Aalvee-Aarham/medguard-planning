import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDown, FileStack, Lock, Search } from 'lucide-react'
import { useT } from '../../i18n'
import { Button, cx } from '../../components/ui'
import { gsap, ScrollTrigger, useGSAP, MOTION_OK, prefersReduced } from '../../lib/motion'
import type { RecordScene } from '../../three/recordScene'

const SLIDES = [
  { icon: FileStack, title: 'One record for every report', body: 'Photograph prescriptions and test reports. MedGuard reads them and builds one clear health record. You check everything before it is saved.' },
  { icon: Search, title: 'See cases like yours', body: 'Compare your record with published cases from doctors. It is not a diagnosis, and you can share any case with your doctor.' },
  { icon: Lock, title: 'Your data stays yours', body: 'You decide who sees your record. Every view is logged, and you are told when a hospital opens it.' },
]

/**
 * H3 Welcome: three slides. A tall scroll track drives a pinned Three.js scene with GSAP ScrollTrigger
 * (scrub + snap to each slide). Swipe = scroll on a phone; Next and the dots work too.
 * Reduced motion or no WebGL: a static illustration per slide, plain scrolling.
 */
export default function Welcome() {
  const t = useT()
  const nav = useNavigate()
  const track = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<RecordScene | null>(null)
  const [idx, setIdx] = useState(0)
  const [webgl, setWebgl] = useState<'pending' | 'on' | 'off'>('pending')
  const textRef = useRef<HTMLDivElement>(null)
  const progress = useRef({ p: -1 })

  // Lazy-load Three.js only for this screen
  useEffect(() => {
    if (prefersReduced()) {
      setWebgl('off')
      return
    }
    let alive = true
    import('../../three/recordScene').then(({ initRecordScene }) => {
      if (!alive || !canvas.current) return
      const sc = initRecordScene(canvas.current)
      if (!sc) return setWebgl('off')
      sceneRef.current = sc
      sc.setProgress(progress.current.p)
      setWebgl('on')
    })
    return () => {
      alive = false
      sceneRef.current?.dispose()
      sceneRef.current = null
    }
  }, [])

  // Hero entrance once (papers assemble), then scroll scrubs -> scene progress 0..2
  useGSAP(
    () => {
      if (webgl !== 'on') return
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        const p = progress.current
        const push = () => sceneRef.current?.setProgress(p.p)
        const intro = gsap.to(p, { p: 0, duration: 1.4, ease: 'power3.out', onUpdate: push })
        const st = ScrollTrigger.create({
          trigger: track.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.6,
          snap: { snapTo: [0, 0.5, 1], duration: { min: 0.2, max: 0.5 }, ease: 'power2.out' },
          onUpdate: (self) => {
            if (intro.isActive()) return
            p.p = self.progress * 2
            push()
          },
        })
        return () => {
          intro.kill()
          st.kill()
        }
      })
      return () => mm.revert()
    },
    { dependencies: [webgl] },
  )

  // Which slide's text shows: follows scroll on all modes
  useEffect(() => {
    const onScroll = () => {
      const el = track.current
      if (!el) return
      const max = el.offsetHeight - window.innerHeight
      const pr = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0
      setIdx(Math.round(pr * 2))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Text cross-fade when the slide changes (200 ms; text itself never parallaxes)
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        gsap.fromTo(textRef.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.25 })
      })
      return () => mm.revert()
    },
    { dependencies: [idx] },
  )

  const goTo = (i: number) => {
    const el = track.current
    if (!el) return
    const max = el.offsetHeight - window.innerHeight
    window.scrollTo({ top: (max * i) / 2, behavior: prefersReduced() ? 'auto' : 'smooth' })
  }
  const finish = () => nav('/auth')
  const s = SLIDES[idx]
  const Icon = s.icon

  return (
    <div ref={track} className="relative" style={{ height: '300dvh' }}>
      <div className="sticky top-0 flex h-dvh flex-col">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-4 pt-4 lg:px-12 lg:pt-8">
          <span className="text-body font-bold text-primary-700">MedGuard</span>
          <Button variant="tertiary" onClick={finish}>
            {t('Skip')}
          </Button>
        </div>

        <div className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col lg:flex-row lg:items-center lg:gap-12 lg:px-12">
        <div className="relative min-h-0 flex-1 lg:h-full">
          <canvas ref={canvas} aria-hidden className={cx('absolute inset-0 size-full', webgl === 'off' && 'hidden')} />
          {webgl !== 'on' && (
            <div className="absolute inset-0 grid place-items-center">
              <StaticArt idx={idx} />
            </div>
          )}
        </div>

        <div className="safe-bottom bg-page px-4 pb-6 lg:w-[440px] lg:shrink-0 lg:px-0 lg:pb-0">
          <div ref={textRef} aria-live="polite">
            <span className="mb-3 grid size-12 place-items-center rounded-full bg-primary-50 text-primary-600">
              <Icon className="size-6" strokeWidth={1.75} aria-hidden />
            </span>
            <h1 className="text-display font-bold text-ink-900">{t(s.title)}</h1>
            <p className="mt-2 max-w-prose text-body text-ink-700">{t(s.body)}</p>
          </div>

          <div className="mt-6 flex items-center gap-2" role="tablist" aria-label={t('Slides')}>
            {SLIDES.map((sl, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === idx}
                aria-label={t('Slide {n} of 3: {title}', { n: i + 1, title: t(sl.title) })}
                onClick={() => goTo(i)}
                className="grid size-12 place-items-center"
              >
                <span className={cx('block h-2 rounded-full transition-all', i === idx ? 'w-8 bg-primary-600' : 'w-2 bg-border-input')} />
              </button>
            ))}
            <span className="flex-1" />
            {idx < 2 && (
              <span className="hidden items-center gap-1 text-small text-ink-500 min-[380px]:flex" aria-hidden>
                <ArrowDown className="size-4" /> {t('Scroll')}
              </span>
            )}
          </div>
          <Button full className="mt-3" onClick={() => (idx < 2 ? goTo(idx + 1) : finish())}>
            {idx < 2 ? t('Next') : t('Get started')}
          </Button>
        </div>
        </div>
      </div>
    </div>
  )
}

/** Fallback illustration (reduced motion / no WebGL): same story in flat blue lines */
function StaticArt({ idx }: { idx: number }) {
  const s = { fill: 'none', stroke: 'var(--color-primary-600)', strokeWidth: 3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
  return (
    <svg viewBox="0 0 240 200" className="h-full max-h-72 w-full max-w-80" aria-hidden>
      <circle cx="120" cy="100" r="86" fill="var(--color-primary-50)" />
      {idx === 0 && (
        <>
          <rect x="78" y="44" width="76" height="104" rx="8" {...s} stroke="var(--color-primary-100)" fill="#fff" />
          <rect x="88" y="52" width="76" height="104" rx="8" {...s} fill="#fff" />
          <path d="M102 76h44M102 92h44M102 108h30" {...s} />
        </>
      )}
      {idx === 1 && (
        <>
          <rect x="94" y="64" width="52" height="72" rx="6" {...s} fill="#fff" />
          {[[40, 50], [166, 50], [40, 126], [166, 126]].map(([x, y], i) => (
            <rect key={i} x={x - 4} y={y - 20} width="40" height="54" rx="5" {...s} stroke={i % 2 ? 'var(--color-primary-100)' : 'var(--color-primary-600)'} fill="#fff" />
          ))}
        </>
      )}
      {idx === 2 && (
        <>
          <path d="M120 36 70 54v40c0 32 22 54 50 64 28-10 50-32 50-64V54z" {...s} fill="#fff" />
          <rect x="102" y="92" width="36" height="30" rx="4" {...s} />
          <path d="M108 92v-8a12 12 0 0 1 24 0v8" {...s} />
        </>
      )}
    </svg>
  )
}
