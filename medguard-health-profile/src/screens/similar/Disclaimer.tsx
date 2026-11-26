import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertOctagon, ArrowLeft, ArrowRight, Check, EyeOff, FileText, Hand, Pause, Play, ScanLine, Stethoscope, type LucideIcon } from 'lucide-react'
import { useApp } from '../../state/store'
import { useT } from '../../i18n'
import { cx } from '../../components/ui'
import { GlassPage, TiltCard } from '../../components/glass'
import { prefersReduced } from '../../lib/motion'
import type { CaseScene } from '../../three/caseScene'

/**
 * H41 Disclaimer (first time only).
 *
 * Left: a holographic skeleton being scanned, with three published case reports orbiting it, outcomes
 * locked (three/caseScene.ts). Right: the three points, each wired to one report (hover or focus a
 * point and its report comes forward), then the consent.
 *
 * Safety (README): the warning, the checkbox and the button never animate in and never wait on the
 * 3D scene. The scene is decoration: aria-hidden, lazy-loaded, and the page works without WebGL.
 */
export function SimilarDisclaimer() {
  const { mutate } = useApp()
  const t = useT()
  const nav = useNavigate()
  const [ok, setOk] = useState(false)
  const [focus, setFocus] = useState<number | null>(null)
  const boxId = useId()

  const points: { icon: LucideIcon; text: string; tag: string }[] = [
    { icon: FileText, tag: t('Written by doctors'), text: t('These are published cases written by doctors. The people in them may differ from you in ways the app cannot see.') },
    { icon: EyeOff, tag: t('Outcome hidden'), text: t('Outcomes are hidden until you choose to see them.') },
    { icon: Stethoscope, tag: t('Ask your doctor'), text: t('Share any case with your doctor and talk it through.') },
  ]

  return (
    <GlassPage>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-8">
        <HoloStage focus={focus} accepted={ok} className="lg:sticky lg:top-6" />

        <div className="flex min-w-0 flex-col gap-4">
          <header className="flex items-start gap-3">
            <button
              type="button"
              aria-label={t('Back')}
              onClick={() => nav(-1)}
              className="neu neu-press grid size-12 shrink-0 place-items-center rounded-2xl text-ink-900"
            >
              <ArrowLeft className="size-5" strokeWidth={2} />
            </button>
            <div className="min-w-0">
              <p className="text-caption font-semibold tracking-[0.18em] text-primary-600 uppercase">
                {t('Similar cases')} · {t('Read this first')}
              </p>
              <h1 className="text-h1 font-bold tracking-tight text-ink-900 md:text-display">{t('Before you look at similar cases')}</h1>
            </div>
          </header>

          {/* Warning: static, always first. Never animated. */}
          <div role="note" className="warn-plate flex items-center gap-3 rounded-[22px] border-2 border-warning-border p-3 md:p-4">
            <span className="warn-icon grid size-12 shrink-0 place-items-center rounded-2xl text-white">
              <AlertOctagon className="size-6" strokeWidth={2} aria-hidden />
            </span>
            <p className="text-h3 font-bold text-warning-text">{t('This is not a diagnosis.')}</p>
          </div>

          <ol className="flex flex-col gap-3" onPointerLeave={() => setFocus(null)}>
            {points.map((p, i) => (
              <li key={i} data-rise onPointerEnter={() => setFocus(i)}>
                <TiltCard
                  max={6}
                  tabIndex={0}
                  onFocus={() => setFocus(i)}
                  onBlur={() => setFocus(null)}
                  className={cx('point-card flex items-start gap-4 !p-4 outline-none md:!p-5', focus === i && 'is-lit')}
                >
                  <span className="pop flex flex-col items-center gap-1">
                    <span className="skeuo-icon grid size-12 place-items-center rounded-2xl">
                      <p.icon className="size-6" strokeWidth={1.75} aria-hidden />
                    </span>
                    <span className="font-mono text-caption font-bold text-primary-600 tabular" aria-hidden>
                      0{i + 1}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-0.5 text-caption font-semibold text-primary-700">
                      <span className="point-dot size-1.5 rounded-full bg-primary-600" aria-hidden />
                      {p.tag}
                    </span>
                    <span className="block text-body text-ink-900">{p.text}</span>
                  </span>
                </TiltCard>
              </li>
            ))}
          </ol>

          {/* Consent: static. The tick and the button respond instantly. */}
          <section className={cx('consent glass rounded-[24px] p-4 md:p-5', ok && 'is-on')}>
            <label htmlFor={boxId} className="flex cursor-pointer items-center gap-4">
              <span className="relative grid size-9 shrink-0 place-items-center">
                <input
                  id={boxId}
                  type="checkbox"
                  checked={ok}
                  onChange={(e) => setOk(e.target.checked)}
                  className="consent-box peer absolute inset-0 size-9 cursor-pointer appearance-none rounded-xl"
                />
                <Check className="pointer-events-none relative size-6 text-white opacity-0 peer-checked:opacity-100" strokeWidth={3} aria-hidden />
              </span>
              <span className="text-h3 font-semibold text-ink-900">{t('I understand this is not medical advice')}</span>
            </label>
            <button
              type="button"
              disabled={!ok}
              onClick={() => {
                mutate((d) => void (d.settings.similarAccepted = true))
                nav('/similar', { replace: true })
              }}
              className="consent-go btn mt-4 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-4 text-body font-semibold select-none disabled:cursor-not-allowed"
            >
              {t('Accept and continue')}
              <ArrowRight className="size-5" strokeWidth={2} aria-hidden />
            </button>
          </section>

          <p className="text-caption text-ink-700">{t('Cases come from PMC-Patients, 167,000 published patient summaries.')}</p>
        </div>
      </div>
    </GlassPage>
  )
}

/** Dark scanner panel holding the 3D scene and its HUD. Decorative; everything it says is also in the page text. */
function HoloStage({ focus, accepted, className }: { focus: number | null; accepted: boolean; className?: string }) {
  const t = useT()
  const canvas = useRef<HTMLCanvasElement>(null)
  const scene = useRef<CaseScene | null>(null)
  const [mode, setMode] = useState<'loading' | '3d' | 'flat'>('loading')
  const [pct, setPct] = useState(0)
  const [paused, setPaused] = useState(() => prefersReduced())
  const live = useRef({ focus, accepted, paused })
  live.current = { focus, accepted, paused }
  const lang = useApp().s.settings.lang

  useEffect(() => {
    let alive = true
    import('../../three/caseScene').then(({ initCaseScene }) => {
      if (!alive || !canvas.current) return
      const sc = initCaseScene(canvas.current, {
        reduced: prefersReduced(),
        cards: [
          { kicker: t('Published case'), title: `${t('Stroke')} · 58`, meta: t('Written by doctors'), foot: t('Outcome hidden'), icon: 'doc' },
          { kicker: t('Published case'), title: `${t('Diabetes')} · 64`, meta: t('Written by doctors'), foot: t('Outcome hidden'), icon: 'lock' },
          { kicker: t('Published case'), title: `${t('High blood pressure')} · 51`, meta: t('Written by doctors'), foot: t('Ask your doctor'), icon: 'share' },
        ],
        onProgress: (p) => alive && setPct(p),
        onReady: () => alive && setMode('3d'),
        onError: () => alive && setMode('flat'),
      })
      if (!sc) return setMode('flat')
      scene.current = sc
      sc.setFocus(live.current.focus)
      sc.setAccepted(live.current.accepted)
      sc.setPaused(live.current.paused)
    })
    return () => {
      alive = false
      scene.current?.dispose()
      scene.current = null
    }
    // rebuild when the language changes so the report textures redraw
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  useEffect(() => scene.current?.setFocus(focus), [focus])
  useEffect(() => scene.current?.setAccepted(accepted), [accepted])
  useEffect(() => scene.current?.setPaused(paused), [paused])

  return (
    <div className={cx('holo-stage relative isolate h-[320px] overflow-hidden rounded-[28px] sm:h-[480px] lg:h-[min(760px,calc(100dvh-3rem))]', accepted && 'is-on', className)}>
      <div aria-hidden className="holo-grid absolute inset-0" />
      <canvas ref={canvas} aria-hidden className={cx('absolute inset-0 size-full touch-pan-y transition-opacity duration-500', mode === '3d' ? 'cursor-grab opacity-100 active:cursor-grabbing' : 'opacity-0')} />
      <div aria-hidden className="holo-scanlines pointer-events-none absolute inset-0" />
      {['top-3 left-3 border-t-2 border-l-2', 'top-3 right-3 border-t-2 border-r-2', 'bottom-3 left-3 border-b-2 border-l-2', 'bottom-3 right-3 border-b-2 border-r-2'].map((c) => (
        <span key={c} aria-hidden className={cx('holo-corner pointer-events-none absolute size-6 rounded-[6px]', c)} />
      ))}

      {/* HUD */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-5">
        <span className="holo-chip inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-caption font-bold tracking-[0.16em] uppercase">
          <span className={cx('holo-led size-2 rounded-full', !paused && 'live')} />
          PMC · {accepted ? 'OK' : 'SCAN'}
        </span>
        <span className="text-right">
          <span className="block font-mono text-h2 leading-none font-bold text-white tabular">
            167,000
          </span>
          <span className="text-caption text-[#bfd8f7]">{t('Published case')} · PMC-Patients</span>
        </span>
      </div>

      {mode === 'loading' && (
        <div className="absolute inset-0 grid place-items-center text-[#bfd8f7]">
          <div className="flex flex-col items-center gap-3">
            <ScanLine className="size-10 animate-pulse" strokeWidth={1.5} aria-hidden />
            <span className="font-mono text-small tabular">{pct}%</span>
          </div>
        </div>
      )}
      {mode === 'flat' && (
        <div aria-hidden className="absolute inset-0 grid place-items-center">
          <div className="flex gap-3">
            {[FileText, EyeOff, Stethoscope].map((I, i) => (
              <span key={i} className={cx('holo-chip grid size-20 place-items-center rounded-2xl', focus === i && 'ring-2 ring-[#5aa2ff]')}>
                <I className="size-8 text-[#d6e6fb]" strokeWidth={1.5} />
              </span>
            ))}
          </div>
        </div>
      )}

      {mode === '3d' && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-4">
          <span aria-hidden className="holo-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-caption font-semibold">
            <Hand className="size-4" strokeWidth={1.75} /> {t('Drag to turn')}
          </span>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            aria-label={paused ? t('Turn slowly') : t('Pause turning')}
            className="holo-chip grid size-11 place-items-center rounded-full text-white transition-transform hover:scale-105"
          >
            {paused ? <Play className="size-5" strokeWidth={2} aria-hidden /> : <Pause className="size-5" strokeWidth={2} aria-hidden />}
          </button>
        </div>
      )}
    </div>
  )
}
