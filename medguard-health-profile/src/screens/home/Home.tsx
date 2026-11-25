import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BellRing, Building2, Camera, Clock, FileText, Hourglass, MessageCircle, Pill, QrCode, Search, Send, Sparkles, X } from 'lucide-react'
import { useApp } from '../../state/store'
import { useT } from '../../i18n'
import { Button, Card, Note, Screen, SectionTitle, Textarea } from '../../components/ui'
import { StatusChip, sourceText } from '../../components/status'
import { Sheet } from '../../components/overlays'
import { Loadable, Skeleton } from '../../components/states'
import { CheckDraw } from '../../components/CheckDraw'
import { useFakeLoad } from '../../mock/api'
import { fmtDate, fmtTime } from '../../lib/format'
import { logDose, upcoming } from '../../lib/doses'
import { gsap, useGSAP, MOTION_OK } from '../../lib/motion'

function greeting(t: (k: string) => string) {
  const h = new Date().getHours()
  return h < 12 ? t('Good morning') : h < 17 ? t('Good afternoon') : t('Good evening')
}

/** H17 Home / H18 Home admitted or waiting */
export default function Home() {
  const { s, profile, can, mutate, toast } = useApp()
  const t = useT()
  const { state, retry } = useFakeLoad('home' + profile.id)
  const header = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const [taken, setTaken] = useState<string | null>(null)

  // Header parallax: the soft blue shapes drift slower than the page (README: dashboard headers)
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
  // Card entrance once on load, 40 ms stagger, 200 ms (README: card and list entrances). Not scroll-triggered.
  useGSAP(
    () => {
      if (state !== 'ok') return
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        gsap.from('[data-enter]', { opacity: 0, y: 12, duration: 0.22, stagger: 0.04, clearProps: 'all' })
      })
      return () => mm.revert()
    },
    { scope: body, dependencies: [state, profile.id] },
  )

  const next = upcoming(s, profile.id)[0]
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
    .slice(0, 4)

  return (
    <div>
      <div ref={header} className="relative overflow-hidden bg-surface px-4 pt-6 pb-8 md:px-6 lg:px-8 lg:pt-10 lg:pb-12">
        <svg aria-hidden className="pointer-events-none absolute inset-0 size-full" preserveAspectRatio="xMaxYMid slice" viewBox="0 0 400 160">
          <g data-depth="0.6">
            <circle cx="350" cy="30" r="70" fill="var(--color-primary-50)" />
          </g>
          <g data-depth="1.2">
            <circle cx="300" cy="130" r="26" fill="none" stroke="var(--color-primary-100)" strokeWidth="3" />
          </g>
        </svg>
        <p className="relative text-display font-bold">
          {greeting(t)}, {self ? name : s.account.name.split(' ')[0]}
        </p>
        {!self && <p className="relative mt-1 text-body text-ink-700">{t('You are looking after {name}’s profile.', { name: profile.name })}</p>}
      </div>

      <Screen wide className="-mt-4">
        <Loadable
          state={state}
          retry={retry}
          skeleton={
            <div className="flex flex-col gap-3" role="status" aria-label={t('Loading')}>
              <Skeleton className="h-36" />
              <Skeleton className="h-24" />
              <Skeleton className="h-20" />
            </div>
          }
        >
          <div ref={body} className="flex flex-col gap-3 lg:grid lg:grid-flow-row-dense lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-x-8 lg:[&>*]:col-start-1">
            {/* Next medicine reminder: critical, never animated after a tap */}
            {next ? (
              <section data-enter aria-labelledby="next-med" className="rounded-card border border-primary-100 bg-primary-50 p-4">
                {taken === next.doseId ? null : (
                  <>
                    <div className="flex flex-wrap items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-primary-600">
                        <Pill className="size-5" strokeWidth={1.75} aria-hidden />
                      </span>
                      <div className="min-w-[60%] flex-1">
                        <h2 id="next-med" className="text-body font-semibold text-ink-900">
                          {next.med.name} <span className="tabular">{next.med.dose}</span>
                        </h2>
                        <p className="text-body text-ink-700 tabular">
                          {fmtTime(next.due)} · {t(next.med.food === 'after' ? 'after food' : next.med.food === 'before' ? 'before food' : 'with or without food')}
                        </p>
                      </div>
                      <StatusChip status={next.status} />
                    </div>
                    {can('upload') && (
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
                  </>
                )}
              </section>
            ) : (
              <Card>
                <p className="text-body text-ink-700">{t('No medicine due today.')}</p>
              </Card>
            )}
            {taken && (
              <div className="flex items-center gap-3 rounded-card border border-success-border bg-success-bg p-4 text-success-text" role="status">
                <CheckDraw size={40} />
                <span className="font-semibold">{t('Taken. Logged at {time}.', { time: fmtTime(new Date()) })}</span>
              </div>
            )}

            {profile.hospital && <HospitalCard />}

            <nav data-enter aria-label={t('Quick actions')} className="grid grid-cols-4 gap-2">
              {[
                { to: '/upload', icon: Camera, label: 'Upload' },
                { to: '/share/qr', icon: QrCode, label: 'My QR' },
                { to: '/ai', icon: MessageCircle, label: 'Ask AI' },
                { to: '/similar', icon: Search, label: 'Similar' },
              ].map((q) => (
                <Link key={q.to} to={q.to} className="card-link flex min-h-20 flex-col items-center justify-center gap-1 rounded-card border border-border-subtle bg-surface p-2 text-center text-small font-semibold">
                  <q.icon className="size-6 text-primary-600" strokeWidth={1.75} aria-hidden />
                  {t(q.label)}
                </Link>
              ))}
            </nav>

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

            <section data-enter className="lg:!col-start-2 lg:row-span-6 lg:row-start-1">
              <SectionTitle action={<Link to="/timeline" className="inline-flex min-h-12 items-center text-small font-semibold text-primary-600">{t('See timeline')}</Link>}>{t('Recent activity')}</SectionTitle>
              {activity.length ? (
                <ul className="divide-y divide-border-subtle rounded-card border border-border-subtle bg-surface">
                  {activity.map((a) => (
                    <li key={a.id}>
                      <Link to={a.to} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-primary-50">
                        <a.icon className="size-5 shrink-0 text-ink-700" aria-hidden />
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
        </Loadable>
      </Screen>
    </div>
  )
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
