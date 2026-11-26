import { useRef, useState, type CSSProperties, type DragEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Camera, ChevronRight, CloudUpload, FileText, Image as ImageIcon, Keyboard, ScanText, ShieldCheck, Sparkles, UserCheck, type LucideIcon } from 'lucide-react'
import { useApp } from '../../state/store'
import { useT } from '../../i18n'
import { cx, Note, PageHeader, Screen } from '../../components/ui'
import { NeedsInternet, StatusChip } from '../../components/status'
import { GlassPage } from '../../components/glass'
import { useTilt } from '../../lib/tilt'
import { makeBatch } from '../../lib/batch'
import { hue, initials } from '../../lib/people'
import { fmtDate } from '../../lib/format'
import type { UploadBatch } from '../../mock/types'

const ACCEPT = 'image/*,application/pdf'

/**
 * H19 Upload source + which profile.
 *
 * Left: a 3D scanner bed. Three sample papers lie fanned on a tilted glass tray, a scan line sweeps the
 * top one and "AI found" boxes pop onto its fields. It is also the drop zone: drag files over it and
 * the papers lift; drop to start a batch. Right: whose record (avatar chips), the four sources as
 * tilting glass cards, and the four steps. Recent uploads sit underneath.
 */
export function UploadSource() {
  const { s, profile, mutate, online, can } = useApp()
  const t = useT()
  const nav = useNavigate()
  const file = useRef<HTMLInputElement>(null)
  const pdf = useRef<HTMLInputElement>(null)
  const any = useRef<HTMLInputElement>(null)
  const writable = s.profiles.filter((p) => p.role !== 'caregiver-view')
  const [forId, setFor] = useState(writable.some((p) => p.id === profile.id) ? profile.id : writable[0]?.id)
  const [drag, setDrag] = useState(false)
  const start = (names: string[]) => {
    if (!names.length || !forId) return
    const b = makeBatch(forId, names)
    mutate((d) => void d.batches.push(b))
    nav(`/upload/${b.id}`)
  }

  if (!can('upload'))
    return (
      <Screen>
        <PageHeader title={t('Upload')} back={false} />
        <Note tone="neutral">{t('View only. Ask {name} to change this.', { name: s.account.name })}</Note>
      </Screen>
    )

  const sources: { kind: string; icon: LucideIcon; label: string; sub: string; go: () => void; net: boolean }[] = [
    { kind: 'camera', icon: Camera, label: 'Camera', sub: 'Many pages at once', go: () => nav(`/upload/camera?for=${forId}`), net: true },
    { kind: 'gallery', icon: ImageIcon, label: 'Gallery', sub: 'Photos on this phone', go: () => file.current?.click(), net: true },
    { kind: 'pdf', icon: FileText, label: 'PDF', sub: 'Reports from a lab', go: () => pdf.current?.click(), net: true },
    { kind: 'type', icon: Keyboard, label: 'Type it in', sub: 'No document needed', go: () => nav('/record/add'), net: false },
  ]
  const recent = s.batches.filter((b) => s.profiles.some((p) => p.id === b.profileId)).slice(-4).reverse()

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDrag(false)
    if (!online) return
    const names = [...e.dataTransfer.files].filter((f) => /^image\/|pdf$/.test(f.type)).map((f) => f.name)
    start(names)
  }

  return (
    <GlassPage>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-8">
        <div
          data-rise
          className="lg:sticky lg:top-24"
          onDragEnter={(e) => (e.preventDefault(), online && setDrag(true))}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDrag(false)}
          onDrop={onDrop}
        >
          <ScannerBed drag={drag} disabled={!online} onPick={() => any.current?.click()} />
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <header data-rise>
            <p className="text-caption font-semibold tracking-[0.18em] text-primary-600 uppercase">{t('Upload')} · AI</p>
            <h1 className="text-h1 font-bold tracking-tight text-ink-900 md:text-display">{t('Add documents')}</h1>
            <p className="mt-1 text-body text-ink-700">{t('Prescriptions, test reports, discharge papers.')}</p>
          </header>

          <fieldset data-rise>
            <legend className="mb-2 text-small font-semibold text-ink-700">{t('This is for')}</legend>
            <div className="flex flex-wrap gap-2">
              {writable.map((p) => {
                const on = p.id === forId
                const c = hue(s.profiles.indexOf(p))
                return (
                  <label key={p.id} className={cx('who-chip flex min-h-14 cursor-pointer items-center gap-2.5 rounded-2xl py-1.5 pr-4 pl-1.5', on && 'is-on')} style={{ '--c1': c[0], '--c2': c[1] } as CSSProperties}>
                    <input type="radio" name="for" value={p.id} checked={on} onChange={() => setFor(p.id)} className="sr-only" />
                    <span className="orb grid size-10 shrink-0 place-items-center rounded-xl text-small font-bold text-white" style={{ '--c1': c[0], '--c2': c[1] } as CSSProperties} aria-hidden>
                      {initials(p.name)}
                    </span>
                    <span className="font-semibold text-ink-900">{p.name}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div data-rise className="grid grid-cols-2 gap-3">
            {sources.map((o) => (
              <SourceCard key={o.kind} {...o} label={t(o.label)} sub={t(o.sub)} disabled={o.net && !online} />
            ))}
          </div>
          {!online && <NeedsInternet />}

          <Steps />
        </div>
      </div>

      {recent.length > 0 && (
        <section data-rise aria-labelledby="recent-h" className="glass glass-sheen mt-8 rounded-[24px] p-3 md:p-4">
          <h2 id="recent-h" className="px-2 pb-2 text-h3 font-semibold">{t('Recent uploads')}</h2>
          <ul className="grid gap-2 md:grid-cols-2">
            {recent.map((b) => (
              <RecentRow key={b.id} b={b} name={s.profiles.find((p) => p.id === b.profileId)?.name ?? ''} />
            ))}
          </ul>
        </section>
      )}

      <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files?.length && start([...e.target.files].map((f) => f.name))} />
      <input ref={pdf} type="file" accept="application/pdf" hidden onChange={(e) => e.target.files?.length && start([...e.target.files].map((f) => f.name))} />
      <input ref={any} type="file" accept={ACCEPT} multiple hidden onChange={(e) => e.target.files?.length && start([...e.target.files].map((f) => f.name))} />
    </GlassPage>
  )
}

/** The tilted glass tray with three papers, a scan line and AI boxes. Decorative except the pick button. */
function ScannerBed({ drag, disabled, onPick }: { drag: boolean; disabled: boolean; onPick: () => void }) {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  useTilt(ref, 6)
  return (
    <section aria-label={t('Drop files here')} className={cx('scan-stage glass relative isolate overflow-hidden rounded-[28px]', drag && 'is-drag', disabled && 'is-off')}>
      <div aria-hidden className="hero-grid absolute inset-0 opacity-60" />
      <div ref={ref} className="tilt relative h-[340px] sm:h-[420px] lg:h-[540px]">
        <div aria-hidden className="scan-tray">
          <span className="scan-bed" />
          {/* back to front */}
          <Paper kind="discharge" title={t('Discharge summary')} className="paper-3" />
          <Paper kind="lab" title={t('Lab report')} className="paper-2" />
          <Paper kind="rx" title={t('Prescription')} className="paper-1" scan />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-4 sm:p-5">
        <button type="button" onClick={onPick} disabled={disabled} className="drop-cta btn inline-flex min-h-14 items-center gap-3 rounded-2xl px-5 font-semibold disabled:cursor-not-allowed">
          <span className="drop-cta-ico grid size-9 place-items-center rounded-xl text-white">
            <CloudUpload className="size-5" strokeWidth={2} aria-hidden />
          </span>
          <span className="text-left leading-tight">
            <span className="block">{drag ? t('Drop to upload') : t('Drop files here')}</span>
            <span className="drop-sub block text-caption font-normal">{t('or choose photos and PDFs')}</span>
          </span>
        </button>
      </div>
    </section>
  )
}

function Paper({ kind, title, className, scan }: { kind: 'rx' | 'lab' | 'discharge'; title: string; className: string; scan?: boolean }) {
  return (
    <div className={cx('paper', className)}>
      <div className="flex items-center justify-between border-b border-[#e3e8ef] pb-1.5">
        <span className="flex items-center gap-1.5">
          <span className="paper-logo grid size-5 place-items-center rounded-md text-[10px] font-black text-white">{kind === 'rx' ? '℞' : kind === 'lab' ? 'L' : 'H'}</span>
          <span className="text-[11px] font-bold text-ink-900">{title}</span>
        </span>
        <span className="font-mono text-[9px] text-ink-500">12/11/2026</span>
      </div>
      {kind === 'rx' && (
        <div className="mt-2 flex flex-col gap-1.5 text-[10px] text-ink-900">
          <p className="ai-box" style={{ '--d': '0.6s' } as CSSProperties} data-tag="Medicine · 93%">
            <b>Metformin 500 mg</b> · 1+0+1 · after food
          </p>
          <p className="ai-box warn" style={{ '--d': '1.6s' } as CSSProperties} data-tag="Medicine · 66%">
            <b>Losartan 50 mg</b> · 0+0+1
          </p>
          <span className="paper-line w-[80%]" />
          <span className="paper-line w-[60%]" />
          <p className="ai-box warn" style={{ '--d': '2.6s' } as CSSProperties} data-tag="Allergy · 58%">
            Allergy: <b>Sulfa drugs</b>
          </p>
          <span className="paper-line w-[70%]" />
          <span className="paper-sign mt-1 self-end" />
        </div>
      )}
      {kind === 'lab' && (
        <div className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[10px] text-ink-900">
          {['Creatinine', 'HbA1c', 'Glucose', 'Hb'].map((r, i) => (
            <span key={r} className="contents">
              <span>{r}</span>
              <b className={cx('tabular', i === 0 && 'text-warning-text')}>{['1.4', '7.2', '6.1', '12.8'][i]}</b>
            </span>
          ))}
          <span className="col-span-2 mt-1 flex h-8 items-end gap-1">
            {[40, 65, 50, 80, 55, 70].map((h, i) => (
              <span key={i} className="paper-bar flex-1 rounded-t-sm" style={{ height: `${h}%` }} />
            ))}
          </span>
        </div>
      )}
      {kind === 'discharge' && (
        <div className="mt-2 flex flex-col gap-1.5">
          {[90, 75, 85, 60, 80, 50].map((w, i) => (
            <span key={i} className="paper-line" style={{ width: `${w}%` }} />
          ))}
          <span className="paper-stamp mt-1 self-end">OK</span>
        </div>
      )}
      {scan && <span className="scan-beam" />}
    </div>
  )
}

function SourceCard({ kind, icon: Icon, label, sub, go, disabled }: { kind: string; icon: LucideIcon; label: string; sub: string; go: () => void; disabled: boolean }) {
  const ref = useRef<HTMLButtonElement>(null)
  useTilt(ref, 8)
  return (
    <button ref={ref} type="button" onClick={go} disabled={disabled} className={cx('src-card tilt glass group relative flex min-h-36 flex-col items-start justify-between gap-3 overflow-hidden rounded-[22px] p-4 text-left disabled:cursor-not-allowed', `src-${kind}`)}>
      <span className="src-ico pop relative grid size-14 place-items-center">
        <span aria-hidden className="src-ghost g1" />
        <span aria-hidden className="src-ghost g2" />
        <span className="skeuo-icon relative grid size-14 place-items-center rounded-2xl">
          <Icon className="size-7" strokeWidth={1.75} aria-hidden />
        </span>
      </span>
      <span className="pop-sm">
        <span className="block text-h3 font-semibold text-ink-900">{label}</span>
        <span className="block text-small text-ink-700">{sub}</span>
      </span>
      <ChevronRight className="absolute top-4 right-4 size-5 text-ink-500 transition-transform group-hover:translate-x-1" aria-hidden />
      <span aria-hidden className="src-flash" />
    </button>
  )
}

/** Upload → AI reads → You check → Saved. A light travels along the line. */
function Steps() {
  const t = useT()
  const steps: { icon: LucideIcon; label: string }[] = [
    { icon: CloudUpload, label: t('Upload') },
    { icon: ScanText, label: t('AI reads') },
    { icon: UserCheck, label: t('You check') },
    { icon: ShieldCheck, label: t('Saved') },
  ]
  return (
    <section data-rise className="neu rounded-[24px] p-4 md:p-5">
      <ol className="steps relative grid grid-cols-4 gap-2">
        <span aria-hidden className="steps-line" />
        {steps.map((st, i) => (
          <li key={st.label} className="relative flex flex-col items-center gap-1.5 text-center" style={{ '--i': i } as CSSProperties}>
            <span className={cx('step-node grid size-12 place-items-center rounded-2xl', i === 1 ? 'is-ai' : 'neu')}>
              <st.icon className="size-5" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="text-caption font-semibold text-ink-900">{st.label}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 flex items-start gap-2 text-small text-ink-700">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-primary-600" strokeWidth={2} aria-hidden />
        {t('AI reads each page. You check what it found before anything is saved.')}
      </p>
    </section>
  )
}

const BATCH_LINK: Record<UploadBatch['status'], string> = { processing: '', issues: '/issues', review: '/review', failed: '/failed', done: '' }

function RecentRow({ b, name }: { b: UploadBatch; name: string }) {
  const t = useT()
  const chip =
    b.status === 'processing' ? <StatusChip status="processing" label={`${t('Processing')} ${b.progress}%`} /> : b.status === 'failed' ? <StatusChip status="failed" /> : b.status === 'done' ? <StatusChip status="confirmed" label={t('Done')} /> : <StatusChip status="due" label={t('Check')} />
  return (
    <li>
      <Link to={`/upload/${b.id}${BATCH_LINK[b.status]}`} className="set-row group flex min-h-16 items-center gap-3 rounded-2xl px-3 py-2">
        <span className="relative grid size-12 shrink-0 place-items-center">
          <span className="src-ghost g1 !opacity-100" aria-hidden />
          <span className="skeuo-icon relative grid size-11 place-items-center rounded-xl">
            <FileText className="size-5" strokeWidth={1.75} aria-hidden />
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-ink-900">{b.pages[0]?.name ?? t('Upload')}</span>
          <span className="block text-small text-ink-700 tabular">
            {name} · {t('{n} pages', { n: b.pages.length })} · {fmtDate(b.createdAt)}
          </span>
        </span>
        {chip}
        <ChevronRight className="size-5 shrink-0 text-ink-500 transition-transform group-hover:translate-x-1" aria-hidden />
      </Link>
    </li>
  )
}
