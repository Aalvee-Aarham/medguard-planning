import { useEffect, useRef, useState } from 'react'
import { Hand, Minus, Pause, Play, Plus, RotateCcw } from 'lucide-react'
import { useT } from '../../i18n'
import { cx } from '../../components/ui'
import { prefersReduced } from '../../lib/motion'
import type { AreaKey, BodyScene, HotspotPoint } from '../../three/bodyScene'
import { STATUS_WORD, type AreaData } from './bodyAreas'

const RING = { danger: 'ring-danger-text text-danger-text', warning: 'ring-warning-text text-warning-text', success: 'ring-success-text text-success-text' }
const DOT = { danger: 'bg-danger-text', warning: 'bg-warning-text', success: 'bg-success-text' }

/**
 * Interactive 3D body (Home). Drag to turn, zoom, auto-rotate with a pause control (anything moving
 * longer than 5 s gets one). Hotspots are real buttons laid over the canvas, so they work with a
 * keyboard and a screen reader. Three.js loads on demand; until then (or without WebGL) a flat
 * figure with the same hotspots shows.
 */
export function BodyExplorer({
  areas, selected, onSelect, onAnchor, className,
}: {
  areas: AreaData[]
  selected: AreaKey | null
  onSelect: (id: AreaKey) => void
  /** selected hotspot position in viewport px, or null when hidden; used for the connector line */
  onAnchor?: (pt: { x: number; y: number } | null) => void
  className?: string
}) {
  const t = useT()
  const stage = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const scene = useRef<BodyScene | null>(null)
  const dots = useRef<Partial<Record<AreaKey, HTMLButtonElement | null>>>({})
  const [mode, setMode] = useState<'loading' | '3d' | 'flat'>('loading')
  const [pct, setPct] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [auto, setAuto] = useState(() => !prefersReduced())
  const selRef = useRef(selected)
  selRef.current = selected
  const anchorRef = useRef(onAnchor)
  anchorRef.current = onAnchor
  const key = areas.map((a) => a.def.id).join(',')

  useEffect(() => {
    let alive = true
    const reduced = prefersReduced()
    import('../../three/bodyScene').then(({ initBodyScene }) => {
      if (!alive || !canvas.current) return
      const sc = initBodyScene(canvas.current, {
        reduced,
        areas: areas.map((a) => ({ id: a.def.id, pos: a.def.pos })),
        onProgress: (p) => alive && setPct(p),
        onReady: () => alive && setLoaded(true),
        onError: () => alive && setMode('flat'),
        onFrame: (pts: Partial<Record<AreaKey, HotspotPoint>>) => {
          for (const [id, p] of Object.entries(pts) as [AreaKey, HotspotPoint][]) {
            const el = dots.current[id]
            if (!el) continue
            el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`
            el.style.opacity = p.front ? '1' : '0.35'
            el.dataset.front = String(p.front)
          }
          const sel = selRef.current && pts[selRef.current]
          const r = canvas.current?.getBoundingClientRect()
          anchorRef.current?.(sel && r ? { x: r.left + sel.x, y: r.top + sel.y } : null)
        },
      })
      if (!sc) return setMode('flat')
      scene.current = sc
      sc.setSelected(selRef.current)
      setMode('3d')
    })
    return () => {
      alive = false
      scene.current?.dispose()
      scene.current = null
    }
    // areas list changes rebuild the scene (e.g. after switching profile)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => scene.current?.setSelected(selected), [selected])
  useEffect(() => scene.current?.setAutoRotate(auto), [auto])

  // flat mode: anchor from the static hotspot position
  useEffect(() => {
    if (mode !== 'flat') return
    const el = selected ? dots.current[selected] : null
    const r = el?.getBoundingClientRect()
    onAnchor?.(r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null)
  }, [mode, selected, onAnchor])

  const ctl = 'btn grid size-12 place-items-center rounded-full border border-border-subtle bg-surface text-ink-700 shadow-bar hover:text-primary-600'

  return (
    <div
      ref={stage}
      className={cx('relative overflow-hidden rounded-card border border-border-subtle bg-surface', className)}
      style={{ backgroundImage: 'radial-gradient(var(--color-border-subtle) 1px, transparent 1.2px)', backgroundSize: '16px 16px' }}
      // moving targets are hard to hit: turning pauses while the pointer is over the stage or focus is inside
      onPointerEnter={(e) => e.pointerType === 'mouse' && scene.current?.setAutoRotate(false)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && scene.current?.setAutoRotate(auto)}
      onFocus={() => scene.current?.setAutoRotate(false)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && scene.current?.setAutoRotate(auto)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === 'ArrowLeft') scene.current?.rotateBy(-0.4)
        if (e.key === 'ArrowRight') scene.current?.rotateBy(0.4)
      }}
      tabIndex={0}
      role="group"
      aria-label={t('Body map. Use the buttons to choose an area; arrow keys turn the figure.')}
    >
      <canvas ref={canvas} aria-hidden className={cx('absolute inset-0 size-full cursor-grab touch-pan-y active:cursor-grabbing', mode !== '3d' && 'invisible')} />
      {(mode !== '3d' || !loaded) && <FlatFigure loading={mode !== 'flat'} />}
      {mode === '3d' && !loaded && (
        <p role="status" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border-subtle bg-surface px-4 py-2 text-small font-semibold text-ink-700 shadow-float tabular">
          {t('Loading 3D body')}
          {pct !== null ? ` ${pct}%` : '…'}
        </p>
      )}

      {/* Hotspots: colour + icon + word (in the label and the panel) */}
      <div className="pointer-events-none absolute inset-0">
        {areas.map((a) => {
          const I = a.def.icon
          const on = a.def.id === selected
          return (
            <button
              key={a.def.id}
              ref={(el) => {
                dots.current[a.def.id] = el
              }}
              type="button"
              aria-pressed={on}
              aria-label={`${t(a.def.label)}: ${t(STATUS_WORD[a.status])}, ${t('{n} items', { n: a.count })}`}
              onClick={() => onSelect(a.def.id)}
              style={mode === '3d' ? { left: 0, top: 0, transform: 'translate(-200px,-200px)' } : { left: `${a.def.pos2[0]}%`, top: `${a.def.pos2[1]}%`, transform: 'translate(-50%, -50%)' }}
              className="pointer-events-auto absolute grid size-12 place-items-center transition-opacity duration-150"
            >
              {on && <span className="absolute size-11 animate-ping rounded-full bg-primary-600/25 motion-reduce:hidden" aria-hidden />}
              <span className={cx('relative grid size-9 place-items-center rounded-full shadow-float ring-2 transition-colors', on ? 'bg-primary-600 text-white ring-primary-600' : cx('bg-surface', RING[a.status]))}>
                <I className="size-[18px]" strokeWidth={2} aria-hidden />
                <span className={cx('absolute -top-1 -right-1 grid size-4 place-items-center rounded-full text-[10px] font-bold text-white', on ? 'bg-primary-700' : DOT[a.status])} aria-hidden>
                  {a.count}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {/* Controls */}
      {mode === '3d' && (
        <div className="absolute right-3 bottom-3 flex gap-2 md:top-1/2 md:bottom-auto md:-translate-y-1/2 md:flex-col">
          <button type="button" className={ctl} aria-pressed={auto} aria-label={auto ? t('Pause turning') : t('Turn slowly')} onClick={() => setAuto(!auto)}>
            {auto ? <Pause className="size-5" /> : <Play className="size-5" />}
          </button>
          <button type="button" className={ctl} aria-label={t('Zoom in')} onClick={() => scene.current?.zoomBy(1.2)}>
            <Plus className="size-5" />
          </button>
          <button type="button" className={ctl} aria-label={t('Zoom out')} onClick={() => scene.current?.zoomBy(1 / 1.2)}>
            <Minus className="size-5" />
          </button>
          <button type="button" className={ctl} aria-label={t('Reset view')} onClick={() => scene.current?.reset()}>
            <RotateCcw className="size-5" />
          </button>
        </div>
      )}
      {mode === '3d' && (
        <p className="pointer-events-none absolute top-3 left-3 flex items-center md:top-auto md:bottom-3 md:left-1/2 md:-translate-x-1/2 gap-2 rounded-full border border-border-subtle bg-surface px-3 py-1 text-caption font-semibold text-ink-700 shadow-bar">
          <Hand className="size-4 text-primary-600" aria-hidden /> {t('Drag to turn')}
        </p>
      )}
    </div>
  )
}

/** Flat front-view figure: shown while Three.js loads, and when WebGL is not available */
function FlatFigure({ loading }: { loading: boolean }) {
  const s = { fill: '#EAF2FD', stroke: 'var(--color-primary-600)', strokeWidth: 2, strokeLinejoin: 'round' as const }
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className={cx('absolute inset-0 size-full p-6', loading && 'skeleton')} aria-hidden>
      <ellipse cx="50" cy="96" rx="18" ry="2.4" fill="none" stroke="var(--color-primary-100)" strokeWidth="1" />
      <circle cx="50" cy="13" r="6" {...s} strokeWidth={1} />
      <path d="M41 24 Q50 21 59 24 L62 44 Q58 50 58 56 L42 56 Q42 50 38 44 Z" {...s} strokeWidth={1} />
      <path d="M41 25 L33 50 L35 51 L43 30 M59 25 L67 50 L65 51 L57 30" {...s} strokeWidth={1} />
      <path d="M43 56 L44 94 L48 94 L49 58 M57 56 L56 94 L52 94 L51 58" {...s} strokeWidth={1} />
    </svg>
  )
}
