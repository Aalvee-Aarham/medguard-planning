import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, ArrowRight, Camera, CheckCircle2, Copy, FileWarning, Keyboard, Pill, RefreshCw, Trash2, UserX, ZoomIn } from 'lucide-react'
import { useApp, uid } from '../../state/store'
import { useT } from '../../i18n'
import { ActionBar, Button, Card, cx, ListRow, List, Note, PageHeader, Screen, Select, Stack } from '../../components/ui'
import { AiField, StatusChip } from '../../components/status'
import { Sheet } from '../../components/overlays'
import { DocThumb } from '../../components/art'
import { CheckDraw } from '../../components/CheckDraw'
import { makeBatch } from '../../lib/batch'
import type { Issue, RecordSection } from '../../mock/types'

/** H19 Upload source + which profile: see UploadHub.tsx */
export { UploadSource } from './UploadHub'

/** H20 Camera capture: multi-page, edge frame, page counter, thumbnails (retake, reorder), blur warning */
export function CameraCapture() {
  const { profile, mutate } = useApp()
  const t = useT()
  const nav = useNavigate()
  const forId = new URLSearchParams(location.search).get('for') ?? profile.id
  const [pages, setPages] = useState<{ id: string; seed: number; blurry: boolean }[]>([])
  const [drag, setDrag] = useState<number | null>(null)
  const native = useRef<HTMLInputElement>(null)
  const snap = () => setPages((p) => [...p, { id: uid('pg'), seed: 20 + p.length * 5, blurry: (p.length + 1) % 3 === 0 }])
  const move = (i: number, dir: -1 | 1) =>
    setPages((p) => {
      const j = i + dir
      if (j < 0 || j >= p.length) return p
      const n = [...p]
      ;[n[i], n[j]] = [n[j], n[i]]
      return n
    })
  const blurry = pages.find((p) => p.blurry)
  return (
    <div className="flex min-h-[calc(100dvh-128px)] flex-col bg-ink-900 text-white">
      <div className="flex items-center gap-2 px-2 py-2">
        <button type="button" aria-label={t('Back')} onClick={() => nav(-1)} className="grid size-12 place-items-center rounded-full hover:bg-white/10">
          <ArrowLeft className="size-6" />
        </button>
        <h1 className="flex-1 text-h3 font-semibold">{t('Photograph your documents')}</h1>
        <span className="rounded-full bg-white/15 px-3 py-1 text-small font-semibold tabular" aria-live="polite">
          {t('{n} pages', { n: pages.length })}
        </span>
      </div>
      <div className="relative mx-4 flex-1 overflow-hidden rounded-card bg-neutral-text" style={{ minHeight: 320 }}>
        <div className="absolute inset-0 grid place-items-center opacity-70">
          <DocThumb seed={pages.length + 7} className="h-4/5" />
        </div>
        <div className="edge-frame" aria-hidden />
        <p className="absolute inset-x-0 bottom-3 text-center text-small font-semibold">{t('Fit the page inside the frame')}</p>
      </div>
      {blurry && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-card border border-warning-border bg-warning-bg p-3 text-warning-text" role="alert">
          <AlertTriangle className="size-5 shrink-0" aria-hidden />
          <span className="flex-1 text-small font-semibold">{t('Page {n} looks blurry. Retake it so AI can read it.', { n: pages.indexOf(blurry) + 1 })}</span>
          <Button variant="secondary" className="min-h-10 px-3" onClick={() => setPages((p) => p.map((x) => (x.id === blurry.id ? { ...x, blurry: false, seed: x.seed + 1 } : x)))}>
            {t('Retake')}
          </Button>
        </div>
      )}
      {pages.length > 0 && (
        <ol className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-4 pb-1" aria-label={t('Pages')}>
          {pages.map((p, i) => (
            <li
              key={p.id}
              draggable
              onDragStart={() => setDrag(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (drag === null || drag === i) return
                setPages((ps) => {
                  const n = [...ps]
                  const [m] = n.splice(drag, 1)
                  n.splice(i, 0, m)
                  return n
                })
                setDrag(null)
              }}
              className="flex w-24 shrink-0 flex-col items-center gap-1"
            >
              <div className={cx('relative rounded-control bg-surface p-1', p.blurry && 'ring-2 ring-warning-border')}>
                <DocThumb seed={p.seed} className="h-24 w-18" rotate={false} />
                <span className="absolute top-1 left-1 grid size-6 place-items-center rounded-full bg-primary-600 text-caption font-semibold">{i + 1}</span>
              </div>
              <div className="flex">
                <button type="button" aria-label={t('Move page {n} left', { n: i + 1 })} onClick={() => move(i, -1)} className="grid size-8 place-items-center rounded-full hover:bg-white/10">
                  <ArrowLeft className="size-4" />
                </button>
                <button type="button" aria-label={t('Remove page {n}', { n: i + 1 })} onClick={() => setPages((ps) => ps.filter((x) => x.id !== p.id))} className="grid size-8 place-items-center rounded-full hover:bg-white/10">
                  <Trash2 className="size-4" />
                </button>
                <button type="button" aria-label={t('Move page {n} right', { n: i + 1 })} onClick={() => move(i, 1)} className="grid size-8 place-items-center rounded-full hover:bg-white/10">
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <div className="flex items-center gap-3 px-4 py-4">
        <Button variant="tertiary" className="text-white hover:bg-white/10" onClick={() => native.current?.click()}>
          {t('Phone camera')}
        </Button>
        <button type="button" aria-label={t('Take photo')} onClick={snap} className="btn mx-auto grid size-18 place-items-center rounded-full border-4 border-white">
          <span className="size-14 rounded-full bg-white" />
        </button>
        <Button
          disabled={!pages.length}
          onClick={() => {
            const b = makeBatch(forId, pages.map((_, i) => `Page ${i + 1}`))
            mutate((d) => {
              d.batches.push(b)
            })
            nav(`/upload/${b.id}`, { replace: true })
          }}
        >
          {t('Done')}
        </Button>
      </div>
      <input
        ref={native}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        hidden
        onChange={(e) => {
          const n = e.target.files?.length ?? 0
          for (let i = 0; i < n; i++) snap()
        }}
      />
    </div>
  )
}

function useBatch() {
  const { id } = useParams()
  const { s } = useApp()
  return s.batches.find((b) => b.id === id)
}

function Missing() {
  const t = useT()
  return (
    <Screen>
      <PageHeader title={t('Upload not found')} />
      <Button to="/upload">{t('Start a new upload')}</Button>
    </Screen>
  )
}

/** H21 Processing: per-document progress. The global processor (Gates) advances it even when you leave. */
export function Processing() {
  const b = useBatch()
  const t = useT()
  const nav = useNavigate()
  if (!b) return <Missing />
  const done = b.status !== 'processing'
  return (
    <Screen>
      <PageHeader title={t('Reading your documents')} back="/home" sub={t('You can leave. We will notify you when it is done.')} />
      <Stack>
        {b.pages.map((p, i) => {
          const pct = Math.min(100, Math.max(0, Math.round(b.progress * 1.4 - i * (40 / b.pages.length))))
          return (
            <Card key={p.id}>
              <div className="flex items-center gap-3">
                <DocThumb seed={p.seed} className="h-16 w-12 shrink-0" rotate={false} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.name}</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary-50" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={p.name}>
                    <div className="h-full rounded-full bg-primary-600 transition-[width] duration-200" style={{ width: `${done ? 100 : pct}%` }} />
                  </div>
                </div>
                <StatusChip status={done || pct >= 100 ? 'confirmed' : 'processing'} label={done || pct >= 100 ? t('Read') : undefined} />
              </div>
            </Card>
          )
        })}
      </Stack>
      <ActionBar>
        {b.status === 'issues' ? (
          <Button full onClick={() => nav(`/upload/${b.id}/issues`)}>
            {t('Resolve {n} problems', { n: b.issues.length })}
          </Button>
        ) : b.status === 'review' ? (
          <Button full onClick={() => nav(`/upload/${b.id}/review`)}>
            {t('Check what AI found')}
          </Button>
        ) : b.status === 'failed' ? (
          <Button full onClick={() => nav(`/upload/${b.id}/failed`)}>
            {t('See what went wrong')}
          </Button>
        ) : (
          <Button full variant="secondary" to="/home">
            {t('Go to Home')}
          </Button>
        )}
      </ActionBar>
    </Screen>
  )
}

const ISSUE_ICON = { duplicate: Copy, name: UserX, unreadable: FileWarning, conflict: Pill }
const ISSUE_TITLE = { duplicate: 'Duplicate', name: 'Different name found', unreadable: 'Unreadable', conflict: 'Conflicting medicines' }

/** H22 Issues to resolve: one card per problem */
export function Issues() {
  const b = useBatch()
  const { mutate, s } = useApp()
  const t = useT()
  const nav = useNavigate()
  if (!b) return <Missing />
  const n = b.pages.length
  const resolve = (is: Issue, v: string) =>
    mutate((d) => {
      d.batches.find((x) => x.id === b.id)!.issues.find((x) => x.id === is.id)!.resolved = v
    })
  const left = b.issues.filter((i) => !i.resolved).length
  const family = s.profiles.filter((p) => p.id !== b.profileId)
  return (
    <Screen>
      <PageHeader title={t('A few things to check')} sub={left ? t('{n} left', { n: left }) : t('All resolved')} />
      <Stack>
        {b.issues.map((is) => {
          const I = ISSUE_ICON[is.kind]
          return (
            <Card key={is.id} className={cx(is.resolved && 'border-success-border')}>
              <div className="flex items-start gap-3">
                <span className={cx('grid size-10 shrink-0 place-items-center rounded-full', is.resolved ? 'bg-success-bg text-success-text' : 'bg-warning-bg text-warning-text')}>
                  <I className="size-5" strokeWidth={1.75} aria-hidden />
                </span>
                <div className="flex-1">
                  <h2 className="text-h3 font-semibold">{t(ISSUE_TITLE[is.kind])}</h2>
                  <p className="text-body text-ink-700">{t(is.detail, { n })}</p>
                </div>
              </div>
              {is.kind === 'duplicate' && (
                <div className="mt-3 flex gap-2">
                  <DocThumb seed={b.pages[0].seed} className="h-20 w-16" rotate={false} />
                  <DocThumb seed={b.pages[n - 1].seed} className="h-20 w-16" rotate={false} />
                </div>
              )}
              <div className="mt-3 flex flex-col gap-2" role="radiogroup" aria-label={t(ISSUE_TITLE[is.kind])}>
                {is.options?.map((o) => {
                  const label = t(o, { n })
                  const on = is.resolved === label
                  return (
                    <button key={o} type="button" role="radio" aria-checked={on} onClick={() => resolve(is, label)} className={cx('btn flex min-h-12 items-center gap-2 rounded-control border px-3 text-left font-semibold', on ? 'border-2 border-primary-600 bg-primary-50 text-primary-700' : 'border-border-input bg-surface')}>
                      {on && <CheckCircle2 className="size-5" aria-hidden />}
                      {label}
                    </button>
                  )
                })}
                {is.kind === 'name' && is.resolved === t('A family member’s') && family.length > 0 && (
                  <Select label={t('Whose is it?')} defaultValue={family[0].id}>
                    {family.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                )}
              </div>
            </Card>
          )
        })}
      </Stack>
      <ActionBar>
        <Button
          full
          disabled={left > 0}
          onClick={() => {
            mutate((d) => {
              d.batches.find((x) => x.id === b.id)!.status = 'review'
            })
            nav(`/upload/${b.id}/review`, { replace: true })
          }}
        >
          {left ? t('Resolve {n} more', { n: left }) : t('Continue to review')}
        </Button>
      </ActionBar>
    </Screen>
  )
}

/** H23 Review extracted data: original on top, AiFields below, Confirm all */
export function Review() {
  const b = useBatch()
  const { s, mutate, toast } = useApp()
  const t = useT()
  const nav = useNavigate()
  const [zoom, setZoom] = useState<number | null>(null)
  const [page, setPage] = useState(0)
  const [done, setDone] = useState(false)
  if (!b) return <Missing />
  const who = s.profiles.find((p) => p.id === b.profileId)!
  const update = (fid: string, patch: Partial<{ value: string; confirmed: boolean }>) =>
    mutate((d) => {
      Object.assign(d.batches.find((x) => x.id === b.id)!.fields.find((f) => f.id === fid)!, patch)
    })
  const confirmAll = () => {
    const now = new Date().toISOString()
    mutate((d) => {
      const bb = d.batches.find((x) => x.id === b.id)!
      bb.status = 'done'
      const docId = uid('d')
      d.documents.unshift({
        id: docId, profileId: b.profileId, title: t('Upload of {date}', { date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }),
        kind: 'prescription', date: now, pages: b.pages.length, seed: b.pages[0].seed, source: { kind: 'self', by: 'you', at: now },
        extracted: bb.fields.map((f) => ({ label: f.label, value: f.value, confidence: f.confidence, confirmed: true })),
      })
      for (const f of bb.fields) {
        const src = { kind: 'ai' as const, by: 'you', at: now }
        if (f.section === 'medicines') {
          const [name, dose] = [f.value.split(' ')[0], f.value.match(/\d+\s?mg/)?.[0] ?? '']
          d.medicines.push({
            id: uid('med'), profileId: b.profileId, name, dose, times: /twice/.test(f.value) ? ['08:00', '20:00'] : ['09:00'], food: /after food/.test(f.value) ? 'after' : 'any',
            prescribedBy: t('From your upload'), start: now, current: true, source: src, documentId: docId, confidence: f.confidence, confirmed: true,
            reminder: { on: true, days: [0, 1, 2, 3, 4, 5, 6], sound: 'Chime', tellCaregivers: false },
          })
        } else {
          d.items.push({ id: uid('r'), profileId: b.profileId, section: f.section as RecordSection, title: f.value, date: now, source: src, documentId: docId, confidence: f.confidence, confirmed: true })
        }
      }
      d.notifications.unshift({ id: uid('n'), kind: 'processed', title: t('{n} items added to {name}’s record', { n: bb.fields.length, name: who.name }), body: t('Checked and confirmed by you.'), at: now, read: true, link: '/record', tier: 'normal' })
    })
    setDone(true)
    toast(t('Added to the record'))
  }
  if (done)
    return (
      <Screen className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 text-center">
        <CheckDraw size={88} />
        <h1 className="text-h1 font-semibold">{t('Added to {name}’s record', { name: who.name })}</h1>
        <p className="text-body text-ink-700">{t('{n} items, each labelled with where it came from.', { n: b.fields.length })}</p>
        <Button full onClick={() => nav('/record')}>
          {t('Open the record')}
        </Button>
      </Screen>
    )
  const unconfirmedLow = b.fields.filter((f) => f.confidence < 0.8 && !f.confirmed).length
  return (
    <Screen>
      <PageHeader title={t('Check what AI found')} sub={t('For {name}. Edit anything that is wrong.', { name: who.name })} />
      <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label={t('Pages')}>
        {b.pages.map((p, i) => (
          <button key={p.id} role="tab" aria-selected={page === i} type="button" onClick={() => setPage(i)} className={cx('shrink-0 rounded-control border-2 p-1', page === i ? 'border-primary-600' : 'border-transparent')}>
            <DocThumb seed={p.seed} className="h-16 w-12" rotate={false} />
          </button>
        ))}
      </div>
      <button type="button" onClick={() => setZoom(page)} className="relative block w-full rounded-card border border-border-subtle bg-neutral-bg p-4" aria-label={t('Zoom into page {n}', { n: page + 1 })}>
        <DocThumb seed={b.pages[page].seed} className="mx-auto h-56" rotate={false} />
        <span className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 text-small font-semibold text-primary-600 shadow-bar">
          <ZoomIn className="size-4" aria-hidden /> {t('Tap to zoom')}
        </span>
      </button>
      {unconfirmedLow > 0 && (
        <Note tone="check" icon={AlertTriangle} className="mt-4">
          {t('{n} fields were hard to read. They are highlighted below.', { n: unconfirmedLow })}
        </Note>
      )}
      <Stack className="mt-4">
        {b.fields.map((f) => (
          <AiField
            key={f.id}
            label={t(f.label)}
            value={f.value}
            confidence={f.confidence}
            confirmed={f.confirmed}
            onChange={(v) => update(f.id, { value: v })}
            onConfirm={() => update(f.id, { confirmed: true })}
            onViewOriginal={() => {
              setPage(f.page)
              setZoom(f.page)
            }}
          />
        ))}
      </Stack>
      <ActionBar>
        <Button full onClick={confirmAll}>
          {t('Confirm all')}
        </Button>
      </ActionBar>
      <Sheet open={zoom !== null} onClose={() => setZoom(null)} title={t('Page {n}', { n: (zoom ?? 0) + 1 })}>
        {zoom !== null && <DocThumb seed={b.pages[zoom].seed} className="mx-auto w-full" rotate={false} />}
      </Sheet>
    </Screen>
  )
}

/** H25 Processing failed: reason, Retry, Retake photo, Enter manually */
export function Failed() {
  const b = useBatch()
  const { mutate } = useApp()
  const t = useT()
  const nav = useNavigate()
  if (!b) return <Missing />
  return (
    <Screen>
      <PageHeader title={t('We could not read these pages')} back="/home" />
      <Note tone="danger" icon={FileWarning}>
        {t(b.failReason ?? 'The photos are too dark to read.')}
      </Note>
      <p className="mt-3 text-body text-ink-700">{t('Your photos are saved. Nothing was added to the record.')}</p>
      <List className="mt-6">
        <ListRow
          icon={RefreshCw}
          title={t('Try reading again')}
          onClick={() => {
            mutate((d) => {
              const x = d.batches.find((y) => y.id === b.id)!
              x.status = 'processing'
              x.progress = 0
              x.failReason = undefined
              d.dev.forceErrors = false
            })
            nav(`/upload/${b.id}`)
          }}
        />
        <ListRow icon={Camera} title={t('Retake photos')} to={`/upload/camera?for=${b.profileId}`} />
        <ListRow icon={Keyboard} title={t('Type it in instead')} to="/record/add" />
      </List>
    </Screen>
  )
}
