import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, BellRing, Building2, CalendarClock, Camera, Clock, FileText, Hourglass, MessageCircle, Pill, QrCode, Search, Send, ShieldCheck, Sparkles, X } from 'lucide-react'
import { useApp } from '../../state/store'
import { useT } from '../../i18n'
import { Button, Card, Note, Screen, SectionTitle, Textarea } from '../../components/ui'
import { StatusChip, sourceText } from '../../components/status'
import { Sheet } from '../../components/overlays'
import { Loadable, Skeleton } from '../../components/states'
import { CheckDraw } from '../../components/CheckDraw'
import { useFakeLoad } from '../../mock/api'
import { fmtDate, fmtTime } from '../../lib/format'
import { logDose, upcoming, type Upcoming } from '../../lib/doses'
import { gsap, useGSAP, MOTION_OK } from '../../lib/motion'
import type { AreaKey } from '../../three/bodyScene'
import { areaData } from './bodyAreas'
import { BodyExplorer } from './BodyExplorer'
import { AreaPanel, ProfileCard, VitalCard } from './HomePanels'
import { HeroBand } from './HeroBand'

function greeting(t: (k: string) => string) {
  const h = new Date().getHours()
  return h < 12 ? t('Good morning') : h < 17 ? t('Good afternoon') : t('Good evening')
}

/**
 * H17 Home / H18 Home admitted or waiting.
 * Desktop: greeting band with the next dose; then profile + vitals | 3D body explorer | area panel,
 * joined by a connector line; then actions and recent activity. Phone: the same blocks in one column.
 * Safety: the next-dose card and the allergy strip never animate; Taken is instant.
 */
export default function Home() {
  const { s, profile, can, mutate } = useApp()
  const t = useT()
  const { state, retry } = useFakeLoad('home' + profile.id)
  const header = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const grid = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLElement>(null)
  const line = useRef<SVGPathElement>(null)
  const lineEnd = useRef<SVGCircleElement>(null)

  const areas = useMemo(() => areaData(s, profile.id), [s, profile.id])
  const [sel, setSel] = useState<AreaKey | null>(null)
  useEffect(() => {
    if (sel && areas.some((a) => a.def.id === sel)) return
    setSel((areas.find((a) => a.status === 'danger') ?? areas[0])?.def.id ?? null)
  }, [areas, sel])
  const area = areas.find((a) => a.def.id === sel) ?? null
  const tests = s.tests.filter((x) => x.profileId === profile.id)

  // Connector from the selected hotspot to the panel (desktop only). Updated from the 3D frame loop.
  const onAnchor = useCallback((pt: { x: number; y: number } | null) => {
    const path = line.current
    const g = grid.current?.getBoundingClientRect()
    const p = panel.current?.getBoundingClientRect()
    const show = !!(pt && g && p && window.matchMedia('(min-width: 1024px)').matches)
    if (!path || !lineEnd.current) return
    path.style.opacity = show ? '1' : '0'
    lineEnd.current.style.opacity = show ? '1' : '0'
    if (!show) return
    const sx = pt!.x - g!.left
    const sy = pt!.y - g!.top
    const ex = p!.left - g!.left
    const ey = p!.top - g!.top + 32
    const mx = sx + (ex - sx) * 0.6
    path.setAttribute('d', `M${sx},${sy} C${mx},${sy} ${mx},${ey} ${ex},${ey}`)
    lineEnd.current.setAttribute('cx', String(ex))
    lineEnd.current.setAttribute('cy', String(ey))
  }, [])

  // Header parallax: soft blue shapes drift slower than the page (README: dashboard headers)
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        gsap.to('[data-depth]', {
          y: (_i, el) => -40 * Number((el as HTMLElement).dataset.depth),
          ease: 'none',
          scrollTrigger: { trigger: header.current, start: 'top top', end: 'bottom top', scrub: true },
        })
      })
      return () => mm.revert()
    },
    { scope: header },
  )
  // Blocks enter once on load, 40 ms stagger. Never on scroll; never the dose card or the allergy strip.
  useGSAP(
    () => {
      if (state !== 'ok') return
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        gsap.from('[data-enter]', { opacity: 0, y: 16, duration: 0.3, stagger: 0.05, clearProps: 'all' })
      })
      return () => mm.revert()
    },
    { scope: body, dependencies: [state, profile.id] },
  )

  const next = upcoming(s, profile.id)[0]
  const dueToday = upcoming(s, profile.id).filter((u) => u.due.toDateString() === new Date().toDateString()).length
  const processing = s.batches.filter((b) => b.profileId === profile.id && b.status !== 'done')
  const self = profile.relation === 'self'
  const name = profile.name.split(' ')[0]

  const has = (sec: string) => s.items.some((i) => i.profileId === profile.id && i.section === sec)
  const prompts = [
    !profile.bloodGroup && { id: 'blood', text: t('Add blood group?'), to: '/settings/personal' },
    !has('allergies') && { id: 'allergy', text: t('Any allergies? Add them so doctors see them first.'), to: '/record/add?type=allergy' },
    !has('vaccinations') && { id: 'vacc', text: t('Add vaccinations?'), to: '/record/add?type=vaccination' },
  ].filter((p): p is { id: string; text: string; to: string } => !!p && !s.dismissedPrompts.includes(profile.id + p.id))

  const activity = [
    ...s.documents.filter((d) => d.profileId === profile.id).map((d) => ({ id: d.id, icon: FileText, text: d.title, sub: sourceText(d.source, t).text, at: d.source.at, to: `/documents/${d.id}` })),
    ...s.accessLog.filter((l) => l.profileId === profile.id).map((l) => ({ id: l.id, icon: l.action === 'emergency' ? BellRing : Clock, text: t('{who} {action} the record', { who: l.who, action: t(l.action) }), sub: '', at: l.at, to: '/share/log' })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 5)

  const attention = areas.filter((a) => a.status === 'danger').length
  const docCount = s.documents.filter((d) => d.profileId === profile.id).length

  const quick = [
    { to: '/upload', icon: Camera, label: 'Upload' },
    { to: '/share/qr', icon: QrCode, label: 'My QR' },
    { to: '/ai', icon: MessageCircle, label: 'Ask AI' },
    { to: '/similar', icon: Search, label: 'Similar' },
    { to: '/timeline', icon: CalendarClock, label: 'Timeline' },
  ]

  return (
    <div>
      {/* Greeting band + next dose: aurora backdrop, glass panels, pointer glow */}
      <HeroBand
        refEl={header}
        dateLabel={fmtDate(new Date())}
        hello={greeting(t)}
        name={self ? name : s.account.name.split(' ')[0]}
        sub={self ? t('Here is your health today.') : t('You are looking after {name}’s profile.', { name: profile.name })}
        stats={[
          { icon: Pill, value: dueToday, label: t('doses today'), tone: 'primary' as const },
          ...(attention > 0 ? [{ icon: AlertTriangle, value: attention, label: t('to review'), tone: 'danger' as const }] : [{ icon: ShieldCheck, value: 0, label: t('All in range'), tone: 'success' as const, hideValue: true }]),
          { icon: FileText, value: docCount, label: t('documents'), tone: 'primary' as const },
        ]}
        quick={quick.map((q) => ({ ...q, label: t(q.label) }))}
        quickLabel={t('Quick actions')}
      >
        <NextDose next={next} canAct={can('upload')} mutate={mutate} />
      </HeroBand>

      <Screen wide className="lg:pt-6">
        <Loadable
          state={state}
          retry={retry}
          skeleton={
            <div className="grid gap-4 lg:grid-cols-[300px_1fr_340px]" role="status" aria-label={t('Loading')}>
              <Skeleton className="h-80" />
              <Skeleton className="h-[440px] lg:h-[640px]" />
              <Skeleton className="h-80" />
            </div>
          }
        >
          <div ref={body} className="flex flex-col gap-6">
            {profile.hospital && <HospitalCard />}

            <div ref={grid} className="relative grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)_340px] lg:items-start lg:gap-6">
              <svg aria-hidden className="pointer-events-none absolute inset-0 z-10 hidden size-full overflow-visible lg:block">
                <path ref={line} fill="none" stroke="var(--color-primary-600)" strokeWidth="1.5" strokeDasharray="4 4" style={{ opacity: 0, transition: 'opacity 200ms' }} />
                <circle ref={lineEnd} r="4" fill="var(--color-surface)" stroke="var(--color-primary-600)" strokeWidth="2" style={{ opacity: 0 }} />
              </svg>

              <div className="order-3 flex min-w-0 flex-col gap-4 lg:order-1">
                <ProfileCard />
                {tests.length > 0 && (
                  <div data-enter className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 md:-mx-6 md:px-6 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
                    {tests.slice(0, 3).map((x) => (
                      <div key={x.id} className="w-[80%] shrink-0 snap-start sm:w-[300px] lg:w-auto">
                        <VitalCard test={x} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div data-enter className="order-1 min-w-0 lg:order-2 lg:sticky lg:top-20">
                <BodyExplorer areas={areas} selected={sel} onSelect={setSel} onAnchor={onAnchor} className="h-[440px] md:h-[540px] lg:h-[640px]" />
              </div>

              <div data-enter className="order-2 min-w-0 lg:order-3">
                <AreaPanel ref={panel} area={area} empty={!areas.length} />
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="flex min-w-0 flex-col gap-6">
                {processing.length > 0 && (
                  <section data-enter>
                    <SectionTitle>{t('Documents in progress')}</SectionTitle>
                    <div className="flex flex-col gap-2">
                      {processing.map((b) => (
                        <Card key={b.id} to={b.status === 'issues' ? `/upload/${b.id}/issues` : b.status === 'review' ? `/upload/${b.id}/review` : b.status === 'failed' ? `/upload/${b.id}/failed` : `/upload/${b.id}`}>
                          <div className="flex items-center gap-3">
                            <Hourglass className="size-5 text-primary-600" aria-hidden />
                            <span className="flex-1 font-semibold">{t('{n} pages', { n: b.pages.length })}</span>
                            <StatusChip status={b.status === 'processing' ? 'processing' : b.status === 'failed' ? 'failed' : 'due'} label={b.status === 'issues' ? t('Needs you') : b.status === 'review' ? t('Ready to check') : undefined} />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </section>
                )}
                {prompts.length > 0 && can('edit') && (
                  <section data-enter>
                    <SectionTitle>{t('Complete your profile')}</SectionTitle>
                    <div className="flex flex-col gap-2">
                      {prompts.map((p) => (
                        <div key={p.id} className="flex items-center gap-2 rounded-card border border-border-subtle bg-surface p-2 pl-4">
                          <Sparkles className="size-5 shrink-0 text-primary-600" aria-hidden />
                          <span className="flex-1 text-body">{p.text}</span>
                          <Button variant="tertiary" to={p.to} className="px-3">
                            {t('Add')}
                          </Button>
                          <button
                            type="button"
                            aria-label={t('Dismiss')}
                            onClick={() =>
                              mutate((d) => {
                                d.dismissedPrompts.push(profile.id + p.id)
                              })
                            }
                            className="grid size-12 place-items-center rounded-full text-ink-700 hover:bg-primary-50"
                          >
                            <X className="size-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              <section data-enter className="min-w-0">
                <SectionTitle action={<Link to="/timeline" className="inline-flex min-h-12 items-center text-small font-semibold text-primary-600">{t('See timeline')}</Link>}>{t('Recent activity')}</SectionTitle>
                {activity.length ? (
                  <ul className="divide-y divide-border-subtle rounded-card border border-border-subtle bg-surface">
                    {activity.map((a) => (
                      <li key={a.id}>
                        <Link to={a.to} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-primary-50">
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-600">
                            <a.icon className="size-4" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{a.text}</span>
                            <span className="block text-caption text-ink-700">{fmtDate(a.at)}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Card>
                    <p className="text-ink-700">{t('Nothing yet. Upload your first report.')}</p>
                  </Card>
                )}
              </section>
            </div>
          </div>
        </Loadable>
      </Screen>
    </div>
  )
}

/** Next medicine reminder: critical, two taps from Home at most. Never animated; Taken is instant. */
function NextDose({ next, canAct, mutate }: { next?: Upcoming; canAct: boolean; mutate: ReturnType<typeof useApp>['mutate'] }) {
  const { toast } = useApp()
  const t = useT()
  const [taken, setTaken] = useState<string | null>(null)
  if (taken)
    return (
      <div className="glass glass-strong flex items-center gap-3 rounded-[20px] p-5 text-success-text" role="status">
        <CheckDraw size={40} />
        <span className="font-semibold">{t('Taken. Logged at {time}.', { time: fmtTime(new Date()) })}</span>
      </div>
    )
  if (!next)
    return (
      <div className="glass glass-strong glass-sheen flex items-center gap-4 rounded-[20px] p-5">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-success-bg text-success-text ring-1 ring-success-border">
          <ShieldCheck className="size-6" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-caption font-semibold tracking-wide text-ink-500 uppercase">{t('Next dose')}</p>
          <p className="text-body font-semibold text-ink-900">{t('No medicine due today.')}</p>
          <p className="text-small text-ink-700">{t('You are all set.')}</p>
        </div>
      </div>
    )
  return (
    <section aria-labelledby="next-med" className="glass glass-strong glass-sheen rounded-[20px] p-5">
      <p className="mb-3 flex items-center gap-2 text-caption font-semibold tracking-wide text-ink-500 uppercase">
        <span className="live-dot size-2 rounded-full bg-primary-600 text-primary-600" aria-hidden />
        {t('Next dose')} · <span className="tabular normal-case">{until(next.due, t)}</span>
      </p>
      <div className="flex flex-wrap items-start gap-3">
        <span className="pill-icon grid size-12 shrink-0 place-items-center rounded-2xl text-white">
          <Pill className="size-6" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-[55%] flex-1">
          <h2 id="next-med" className="text-body font-semibold text-ink-900">
            {next.med.name} <span className="tabular">{next.med.dose}</span>
          </h2>
          <p className="text-body text-ink-700 tabular">
            {fmtTime(next.due)} · {t(next.med.food === 'after' ? 'after food' : next.med.food === 'before' ? 'before food' : 'with or without food')}
          </p>
        </div>
        <StatusChip status={next.status} />
      </div>
      {canAct && (
        <div className="mt-4 flex gap-2">
          <Button
            className="flex-1"
            onClick={() => {
              logDose(mutate, next.med, next.due, 'taken')
              setTaken(next.doseId)
              toast(t('{med} marked taken', { med: next.med.name }))
            }}
          >
            {t('Taken')}
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              logDose(mutate, next.med, next.due, 'snoozed', { snoozeMin: 10 })
              toast(t('Reminder in 10 minutes'))
            }}
          >
            {t('Snooze')}
          </Button>
        </div>
      )}
    </section>
  )
}

/** "in 2 h 15 min", "in 20 min", "now" or "overdue" for the next-dose eyebrow. */
function until(due: Date, t: (k: string, v?: Record<string, string | number>) => string) {
  const m = Math.round((due.getTime() - Date.now()) / 60000)
  if (m < -5) return t('overdue')
  if (m <= 0) return t('now')
  const h = Math.floor(m / 60)
  return h ? t('in {h} h {m} min', { h, m: m % 60 }) : t('in {m} min', { m })
}

/** H18: hospital card. Admitted: hospital, ward, bed, since. Waiting: queue + Request urgent review. */
function HospitalCard() {
  const { profile, mutate, can, toast, online } = useApp()
  const t = useT()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const h = profile.hospital!
  return (
    <section data-enter aria-labelledby="hosp" className="rounded-card border border-border-subtle bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-600">
          <Building2 className="size-5" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="flex-1">
          <h2 id="hosp" className="text-h3 font-semibold">
            {h.hospital}
          </h2>
          {h.state === 'admitted' ? (
            <p className="text-body text-ink-700">
              {h.ward} · <span className="font-semibold whitespace-nowrap text-ink-900">{h.bed}</span>
              <br />
              {t('Admitted since {date}', { date: fmtDate(h.since) })}
            </p>
          ) : (
            <p className="text-body text-ink-700">
              {h.ward} · {t('Waiting list')}
              <br />
              <span className="font-semibold text-ink-900 tabular">{t('Position {n} in the queue', { n: h.queuePosition ?? 0 })}</span>
            </p>
          )}
        </div>
        <StatusChip status={h.state === 'admitted' ? 'active' : 'next'} label={h.state === 'admitted' ? t('Admitted') : t('Waiting')} />
      </div>
      {h.state === 'waiting' && (
        <div className="mt-3">
          {h.urgency ? (
            h.urgency.answer ? (
              <Note tone={h.urgency.answer === 'raised' ? 'success' : 'neutral'}>
                <span className="font-semibold">{h.urgency.answer === 'raised' ? t('Priority raised by ward staff.') : t('Ward staff kept the current priority.')}</span>
                {h.urgency.answerNote && <span className="block text-small">{h.urgency.answerNote}</span>}
              </Note>
            ) : (
              <Note tone="info" icon={Send}>
                {t('Sent. Ward staff will decide.')}
              </Note>
            )
          ) : (
            can('urgent') && (
              <Button variant="secondary" full onClick={() => setOpen(true)} disabled={!online}>
                {t('Request urgent review')}
              </Button>
            )
          )}
        </div>
      )}
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={t('Request urgent review')}
        footer={
          <Button
            full
            disabled={!reason.trim()}
            onClick={() => {
              mutate((d) => {
                const p = d.profiles.find((x) => x.id === profile.id)!
                p.hospital!.urgency = { reason: reason.trim(), sentAt: new Date().toISOString() }
              })
              setOpen(false)
              toast(t('Request sent'))
            }}
          >
            {t('Send request')}
          </Button>
        }
      >
        <p className="mb-4 text-body text-ink-700">{t('Tell the ward why this is urgent. Staff look at every request and decide the order.')}</p>
        <Textarea label={t('What has changed?')} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('For example: pain is worse since this morning')} />
      </Sheet>
    </section>
  )
}
