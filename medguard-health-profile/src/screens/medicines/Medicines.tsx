import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, BellRing, CalendarDays, Check, ChevronLeft, ChevronRight, Clock, FileText, Minus, Moon, Pill, Plus, Stethoscope, Sun, X } from 'lucide-react'
import { useApp } from '../../state/store'
import { useT } from '../../i18n'
import { ActionBar, Button, Card, cx, Input, List, ListRow, Note, PageHeader, Screen, SectionTitle, Select, Stack, Toggle } from '../../components/ui'
import { AllergyStrip, SourceLabel, StatusChip } from '../../components/status'
import { EmptyState, Loadable } from '../../components/states'
import { CheckDraw } from '../../components/CheckDraw'
import { useFakeLoad } from '../../mock/api'
import { fmtDate, fmtHHMM, fmtTime, monthName } from '../../lib/format'
import { logDose, upcoming } from '../../lib/doses'
import { prefersReduced } from '../../lib/motion'
import { GlassHero, GlassPage, NeuStat, Panel, Segmented, TiltCard } from '../../components/glass'

const foodLabel = (f: string) => (f === 'after' ? 'After food' : f === 'before' ? 'Before food' : 'With or without food')

/** H34 Medicines: glass hero with today's dose ring, a 24-hour schedule rail, and capsule cards. The allergy strip stays static. */
export function MedicineList() {
  const { s, profile, can } = useApp()
  const t = useT()
  const [tab, setTab] = useState<'current' | 'past'>('current')
  const { state, retry } = useFakeLoad('meds')
  const mine = s.medicines.filter((m) => m.profileId === profile.id)
  const list = mine.filter((m) => m.current === (tab === 'current'))
  const up = upcoming(s, profile.id)
  const today = new Date().toDateString()
  const onMeds = mine.filter((m) => m.current && m.reminder.on)
  const dosesToday = onMeds.reduce((a, m) => a + m.times.length, 0)
  const takenToday = s.doseLogs.filter((l) => l.profileId === profile.id && l.status === 'taken' && new Date(l.due).toDateString() === today).length
  const next = up[0]
  return (
    <GlassPage>
      <GlassHero
        icon={Pill}
        eyebrow={t('My Record')}
        title={t('Medicines')}
        sub={next ? t('Next: {med} at {time}', { med: `${next.med.name} ${next.med.dose}`, time: fmtTime(next.due) }) : t('No medicine due today.')}
        actions={
          can('edit') && (
            <Button icon={Plus} to="/record/add?type=medicines" className="rounded-2xl px-4">
              {t('Add')}
            </Button>
          )
        }
      >
        <NeuStat icon={Pill} label={t('Current')} value={mine.filter((m) => m.current).length} />
        <NeuStat icon={BellRing} label={t('Doses today')} value={dosesToday} />
        <NeuStat icon={Check} label={t('Taken today')} value={takenToday} tone="success" />
        <NeuStat icon={Clock} label={t('Next dose')} text={next ? fmtTime(next.due) : '—'} />
      </GlassHero>

      <div data-rise>
        <AllergyStrip profileId={profile.id} />
      </div>

      {onMeds.length > 0 && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <Panel neu title={t('Today')}>
            <DoseRing done={Math.min(takenToday, dosesToday)} total={dosesToday} label={t('taken')} />
          </Panel>
          <Panel title={t('Schedule')}>
            <DayRail meds={onMeds} />
          </Panel>
        </div>
      )}

      <div data-rise className="mt-6 mb-5 flex">
        <Segmented
          label={t('Medicines')}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'current', label: t('Current'), count: mine.filter((m) => m.current).length },
            { value: 'past', label: t('Past'), count: mine.filter((m) => !m.current).length },
          ]}
        />
      </div>
      <Loadable state={state} retry={retry}>
        {list.length ? (
          <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {list.map((m, i) => {
              const u = up.find((x) => x.med.id === m.id)
              return (
                <li key={m.id} data-rise>
                  <TiltCard to={`/medicines/${m.id}`} className="h-full">
                    <div className="flex items-start gap-4">
                      <Capsule hue={i} muted={tab === 'past'} />
                      <div className="min-w-0 flex-1">
                        <p className="text-h3 font-semibold">
                          {m.name} <span className="tabular whitespace-nowrap text-primary-700">{m.dose}</span>
                        </p>
                        <p className="text-small text-ink-700">{t(foodLabel(m.food))}</p>
                      </div>
                      {tab === 'current' ? u ? <StatusChip status={u.status} /> : <StatusChip status="skipped" label={t('Off')} /> : <StatusChip status="expired" label={t('Past')} />}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {m.times.map((tm) => {
                        const h = Number(tm.slice(0, 2))
                        const I = h >= 6 && h < 18 ? Sun : Moon
                        return (
                          <span key={tm} className="neu-inset inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-small font-semibold tabular">
                            <I className="size-4 text-primary-600" strokeWidth={2} aria-hidden />
                            {fmtHHMM(tm)}
                          </span>
                        )
                      })}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/70 pt-3 text-caption text-ink-700">
                      <span className="flex min-w-0 items-center gap-1 truncate">
                        <Stethoscope className="size-3.5 shrink-0" aria-hidden /> {m.prescribedBy}
                      </span>
                      <span className="shrink-0 tabular">
                        {tab === 'current' ? (u ? `${t('Next')}: ${fmtTime(u.due)}` : t('Reminders off')) : t('Stopped {date}', { date: fmtDate(m.end ?? m.start) })}
                      </span>
                    </div>
                  </TiltCard>
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState art="pills" text={tab === 'current' ? t('No current medicines. Add one or upload a prescription.') : t('No past medicines.')} action={tab === 'current' && can('upload') && <Button to="/upload">{t('Upload a prescription')}</Button>} />
        )}
      </Loadable>
    </GlassPage>
  )
}

/** Glossy two-tone capsule drawn in CSS; colour cycles by index using theme tokens. */
function Capsule({ hue, muted }: { hue: number; muted?: boolean }) {
  const tones = [
    ['var(--color-primary-600)', 'var(--color-primary-100)'],
    ['var(--color-success-text)', 'var(--color-success-bg)'],
    ['var(--color-warning-text)', 'var(--color-warning-bg)'],
    ['var(--color-primary-700)', 'var(--color-check-bg)'],
  ]
  const [a, b] = muted ? ['var(--color-border-input)', 'var(--color-neutral-bg)'] : tones[hue % tones.length]
  return (
    <span aria-hidden className="neu grid size-14 shrink-0 place-items-center rounded-2xl">
      <span className="relative flex h-5 w-11 -rotate-45 overflow-hidden rounded-full shadow-[0_4px_8px_-2px_rgba(15,27,45,0.35)] transition-transform duration-300 group-hover:rotate-[-25deg]">
        <span className="h-full w-1/2" style={{ background: `linear-gradient(180deg, ${a}, color-mix(in oklab, ${a} 70%, var(--color-ink-900)))` }} />
        <span className="h-full w-1/2" style={{ background: `linear-gradient(180deg, var(--color-white), ${b})` }} />
        <span className="absolute inset-x-1 top-0.5 h-1.5 rounded-full bg-white/60" />
      </span>
    </span>
  )
}

/** Ring of today's doses: taken / total, animated with anime.js. */
function DoseRing({ done, total, label }: { done: number; total: number; label: string }) {
  const ring = useRef<SVGCircleElement>(null)
  const R = 40
  const C = 2 * Math.PI * R
  const pct = total ? done / total : 0
  useEffect(() => {
    const el = ring.current
    if (!el || prefersReduced()) return
    let stop: (() => void) | undefined
    import('animejs').then(({ animate }) => {
      const a = animate(el, { strokeDashoffset: [C, C * (1 - pct)], duration: 1200, ease: 'outExpo' })
      stop = () => a.revert()
    })
    return () => stop?.()
  }, [pct, C])
  return (
    <figure className="neu relative mx-auto grid size-40 place-items-center rounded-full" aria-label={`${done} / ${total} ${label}`}>
      <svg viewBox="0 0 100 100" className="absolute inset-2 -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={R} fill="none" stroke="var(--color-primary-50)" strokeWidth="9" />
        <circle ref={ring} cx="50" cy="50" r={R} fill="none" stroke="var(--color-success-text)" strokeWidth="9" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
      </svg>
      <figcaption className="neu-inset grid size-24 place-items-center rounded-full text-center">
        <span>
          <span className="block text-h1 leading-none font-bold tabular">
            {done}
            <span className="text-h3 text-ink-500">/{total}</span>
          </span>
          <span className="text-caption text-ink-700">{label}</span>
        </span>
      </figcaption>
    </figure>
  )
}

/** 24-hour rail: a glass track with day/night shading, a marker per dose and a live "now" line. */
function DayRail({ meds }: { meds: { id: string; name: string; dose: string; times: string[] }[] }) {
  const t = useT()
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60000)
    return () => window.clearInterval(id)
  }, [])
  const pct = (h: number, m: number) => ((h * 60 + m) / 1440) * 100
  const doses = meds.flatMap((m) => m.times.map((tm) => ({ id: m.id + tm, name: m.name, dose: m.dose, tm, at: pct(Number(tm.slice(0, 2)), Number(tm.slice(3, 5))) }))).sort((a, b) => a.at - b.at)
  const nowPct = pct(now.getHours(), now.getMinutes())
  return (
    <div>
      <div className="relative mt-8 mb-10">
        <div className="neu-inset relative h-6 overflow-hidden rounded-full">
          <span aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,rgba(23,76,153,0.22)_0%,rgba(23,76,153,0.22)_25%,rgba(254,200,75,0.35)_37%,rgba(254,200,75,0.35)_63%,rgba(23,76,153,0.22)_75%)]" />
          <span aria-hidden className="absolute inset-y-0 left-0 bg-primary-600/20" style={{ width: `${nowPct}%` }} />
        </div>
        <span aria-hidden className="absolute -top-2 -bottom-2 w-0.5 bg-danger-text" style={{ left: `${nowPct}%` }}>
          <span className="absolute -top-5 left-1/2 -translate-x-1/2 rounded bg-danger-text px-1 text-caption font-semibold text-white">{t('now')}</span>
        </span>
        {doses.map((d, i) => (
          <span key={d.id} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${d.at}%` }}>
            <span className={cx('skeuo-icon grid size-8 place-items-center rounded-full ring-4 ring-white', d.at < nowPct && 'opacity-60')}>
              <Pill className="size-4" strokeWidth={2} aria-hidden />
            </span>
            <span className={cx('absolute left-1/2 -translate-x-1/2 text-caption font-semibold whitespace-nowrap tabular', i % 2 ? '-top-7' : 'top-9')}>{fmtHHMM(d.tm)}</span>
          </span>
        ))}
      </div>
      <div className="flex justify-between text-caption text-ink-500 tabular" aria-hidden>
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>24:00</span>
      </div>
      <ul className="mt-4 flex flex-wrap gap-2">
        {doses.map((d) => (
          <li key={d.id} className="glass inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-small">
            <span className="font-semibold tabular">{fmtHHMM(d.tm)}</span>
            <span className="text-ink-700">
              {d.name} {d.dose}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function useMed() {
  const { id } = useParams()
  const { s } = useApp()
  return s.medicines.find((m) => m.id === id)
}

/** H35 Medicine detail */
export function MedicineDetail() {
  const m = useMed()
  const { can } = useApp()
  const t = useT()
  if (!m) return <Screen><PageHeader title={t('Not found')} /></Screen>
  return (
    <Screen>
      <PageHeader title={`${m.name} ${m.dose}`} />
      <AllergyStrip profileId={m.profileId} />
      <List className="mt-4">
        <ListRow icon={Pill} title={<span className="tabular">{m.dose}</span>} sub={t('Dose')} />
        <ListRow icon={Clock} title={<span className="tabular">{m.times.map(fmtHHMM).join(', ')}</span>} sub={t(foodLabel(m.food))} />
        <ListRow icon={CalendarDays} title={<span className="tabular">{fmtDate(m.start)} – {m.end ? fmtDate(m.end) : t('ongoing')}</span>} sub={t('Start and end')} />
        <ListRow icon={FileText} title={m.prescribedBy} sub={t('Prescribed by')} to={m.documentId ? `/documents/${m.documentId}` : undefined} />
      </List>
      <SourceLabel source={m.source} className="mt-3" />
      <Stack className="mt-6" gap={2}>
        {m.current && can('edit') && (
          <Button full icon={BellRing} to={`/medicines/${m.id}/reminder`}>
            {t('Set reminders')}
          </Button>
        )}
        <Button full variant="secondary" icon={CalendarDays} to={`/medicines/${m.id}/log`}>
          {t('See taken log')}
        </Button>
      </Stack>
    </Screen>
  )
}

/** H36 Reminder setup */
export function ReminderSetup() {
  const m = useMed()
  const { mutate, toast } = useApp()
  const t = useT()
  const nav = useNavigate()
  const [r, setR] = useState(m?.reminder ?? { on: true, days: [0, 1, 2, 3, 4, 5, 6], sound: 'Chime', tellCaregivers: false })
  const [times, setTimes] = useState(m?.times ?? ['08:00'])
  if (!m) return <Screen><PageHeader title={t('Not found')} /></Screen>
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return (
    <Screen>
      <PageHeader title={t('Reminders')} sub={`${m.name} ${m.dose}`} />
      <Card>
        <Toggle label={t('Remind me')} checked={r.on} onChange={(on) => setR({ ...r, on })} />
      </Card>
      <SectionTitle>{t('Times')}</SectionTitle>
      <Stack gap={2}>
        {times.map((tm, i) => (
          <div key={i} className="flex items-end gap-2">
            <Input label={t('Time {n}', { n: i + 1 })} type="time" value={tm} onChange={(e) => setTimes(times.map((x, j) => (j === i ? e.target.value : x)))} className="flex-1" />
            {times.length > 1 && (
              <button type="button" aria-label={t('Remove time {n}', { n: i + 1 })} onClick={() => setTimes(times.filter((_, j) => j !== i))} className="grid size-12 place-items-center rounded-full hover:bg-primary-50">
                <X className="size-5" />
              </button>
            )}
          </div>
        ))}
        <Button variant="tertiary" icon={Plus} className="self-start" onClick={() => setTimes([...times, '12:00'])}>
          {t('Add a time')}
        </Button>
      </Stack>
      <SectionTitle>{t('Days')}</SectionTitle>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('Days')}>
        {DAYS.map((d, i) => {
          const on = r.days.includes(i)
          return (
            <button key={d} type="button" aria-pressed={on} onClick={() => setR({ ...r, days: on ? r.days.filter((x) => x !== i) : [...r.days, i] })} className={cx('btn min-h-12 min-w-12 rounded-full border px-3 font-semibold', on ? 'border-primary-600 bg-primary-100 text-primary-700' : 'border-border-input bg-surface text-ink-700')}>
              {t(d)}
            </button>
          )
        })}
      </div>
      <div className="mt-6 flex flex-col gap-4">
        <Select label={t('For how long')} value={String(r.durationDays ?? 0)} onChange={(e) => setR({ ...r, durationDays: Number(e.target.value) || undefined })}>
          <option value="0">{t('Until I stop it')}</option>
          <option value="7">{t('7 days')}</option>
          <option value="30">{t('30 days')}</option>
          <option value="90">{t('90 days')}</option>
        </Select>
        <Select label={t('Sound')} value={r.sound} onChange={(e) => setR({ ...r, sound: e.target.value })}>
          {['Chime', 'Bell', 'Soft beep'].map((x) => (
            <option key={x} value={x}>
              {t(x)}
            </option>
          ))}
        </Select>
      </div>
      <Card className="mt-4">
        <Toggle label={t('Tell caregivers if missed')} desc={t('They get a message if a dose is not marked within 1 hour.')} checked={r.tellCaregivers} onChange={(v) => setR({ ...r, tellCaregivers: v })} />
      </Card>
      <ActionBar>
        <Button
          full
          onClick={() => {
            mutate((d) => {
              const x = d.medicines.find((y) => y.id === m.id)!
              x.reminder = r
              x.times = times
            })
            toast(t('Reminders saved'))
            nav(-1)
          }}
        >
          {t('Save reminders')}
        </Button>
      </ActionBar>
    </Screen>
  )
}

/** H37 Reminder action (from a notification): Taken / Skip (reason) / Snooze 10/30/60 */
export function ReminderAction() {
  const { doseId } = useParams()
  const { s, mutate, toast } = useApp()
  const t = useT()
  const nav = useNavigate()
  const [medId, iso] = (doseId ?? '').split('@')
  const m = s.medicines.find((x) => x.id === medId)
  const [mode, setMode] = useState<'ask' | 'skip' | 'snooze' | 'done'>('ask')
  const [reason, setReason] = useState('')
  if (!m) return <Screen><PageHeader title={t('Reminder not found')} /></Screen>
  const due = iso ? new Date(iso) : new Date()
  const who = s.profiles.find((p) => p.id === m.profileId)!
  if (mode === 'done')
    return (
      <Screen className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 text-center">
        <CheckDraw size={88} />
        <h1 className="text-h1 font-semibold">{t('Marked taken')}</h1>
        <p className="text-body text-ink-700 tabular">{m.name} {m.dose} · {fmtTime(new Date())}</p>
        <Button full variant="secondary" to="/home">{t('Go to Home')}</Button>
      </Screen>
    )
  return (
    <Screen>
      <PageHeader title={t('Time for your medicine')} back="/home" />
      <p className="mb-2 text-body text-ink-700">{t('For {name}', { name: who.name })}</p>
      <AllergyStrip profileId={m.profileId} />
      <Card className="mt-4 border-primary-100 bg-primary-50">
        <p className="text-h2 font-semibold">
          {m.name} <span className="tabular">{m.dose}</span>
        </p>
        <p className="text-body text-ink-700 tabular">
          {fmtTime(due)} · {t(foodLabel(m.food))}
        </p>
      </Card>
      {mode === 'ask' && (
        <Stack className="mt-6" gap={3}>
          {/* Critical action: big, instant, never delayed by animation */}
          <Button
            full
            big
            icon={Check}
            onClick={() => {
              logDose(mutate, m, due, 'taken')
              setMode('done')
            }}
          >
            {t('Taken')}
          </Button>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setMode('skip')}>
              {t('Skip')}
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => setMode('snooze')}>
              {t('Snooze')}
            </Button>
          </div>
        </Stack>
      )}
      {mode === 'skip' && (
        <Stack className="mt-6">
          <Select label={t('Why are you skipping?')} value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">{t('Choose a reason')}</option>
            {['Felt sick', 'Ran out of medicine', 'Doctor told me to stop', 'Forgot to bring it', 'Other'].map((x) => (
              <option key={x} value={x}>
                {t(x)}
              </option>
            ))}
          </Select>
          {m.reminder.tellCaregivers && <Note tone="info">{t('Your caregivers will be told this dose was skipped.')}</Note>}
          <Button
            full
            disabled={!reason}
            onClick={() => {
              logDose(mutate, m, due, 'skipped', { reason })
              toast(t('Dose skipped'))
              nav('/home')
            }}
          >
            {t('Skip this dose')}
          </Button>
          <Button full variant="tertiary" onClick={() => setMode('ask')}>
            {t('Back')}
          </Button>
        </Stack>
      )}
      {mode === 'snooze' && (
        <Stack className="mt-6">
          <p className="font-semibold">{t('Remind me again in')}</p>
          <div className="grid grid-cols-3 gap-2">
            {[10, 30, 60].map((n) => (
              <Button
                key={n}
                variant="secondary"
                onClick={() => {
                  logDose(mutate, m, due, 'snoozed', { snoozeMin: n })
                  toast(t('Reminder in {n} minutes', { n }))
                  nav('/home')
                }}
              >
                <span className="tabular">{t('{n} min', { n })}</span>
              </Button>
            ))}
          </div>
          <Button full variant="tertiary" onClick={() => setMode('ask')}>
            {t('Back')}
          </Button>
        </Stack>
      )}
    </Screen>
  )
}

/** H38 Taken log: month calendar; legend has icon + word */
export function TakenLog() {
  const m = useMed()
  const { s } = useApp()
  const t = useT()
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  if (!m) return <Screen><PageHeader title={t('Not found')} /></Screen>
  const logs = s.doseLogs.filter((l) => l.medicineId === m.id)
  const y = cursor.getFullYear()
  const mo = cursor.getMonth()
  const days = new Date(y, mo + 1, 0).getDate()
  const lead = new Date(y, mo, 1).getDay()
  const dayStatus = (d: number) => {
    const ls = logs.filter((l) => {
      const x = new Date(l.due)
      return x.getFullYear() === y && x.getMonth() === mo && x.getDate() === d && l.status !== 'snoozed'
    })
    if (!ls.length) return null
    if (ls.some((l) => l.status === 'missed')) return 'missed'
    if (ls.some((l) => l.status === 'skipped')) return 'skipped'
    return 'taken'
  }
  const ST = {
    taken: { cls: 'bg-success-bg text-success-text border-success-border', icon: Check, label: 'Taken' },
    skipped: { cls: 'bg-neutral-bg text-neutral-text border-border-subtle', icon: Minus, label: 'Skipped' },
    missed: { cls: 'bg-danger-bg text-danger-text border-danger-border', icon: X, label: 'Missed' },
  }
  const counts = { taken: 0, skipped: 0, missed: 0 }
  for (let d = 1; d <= days; d++) {
    const st = dayStatus(d)
    if (st) counts[st]++
  }
  return (
    <Screen>
      <PageHeader title={t('Taken log')} sub={`${m.name} ${m.dose}`} />
      <div className="mb-3 flex items-center justify-between">
        <button type="button" aria-label={t('Previous month')} onClick={() => setCursor(new Date(y, mo - 1, 1))} className="grid size-12 place-items-center rounded-full hover:bg-primary-50">
          <ChevronLeft className="size-6" />
        </button>
        <h2 className="text-h2 font-semibold tabular">
          {monthName(mo)} {y}
        </h2>
        <button type="button" aria-label={t('Next month')} onClick={() => setCursor(new Date(y, mo + 1, 1))} className="grid size-12 place-items-center rounded-full hover:bg-primary-50">
          <ChevronRight className="size-6" />
        </button>
      </div>
      <Card className="p-3">
        <div className="grid grid-cols-7 gap-1 text-center text-caption font-semibold text-ink-700" aria-hidden>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: lead }).map((_, i) => (
            <span key={'l' + i} />
          ))}
          {Array.from({ length: days }).map((_, i) => {
            const st = dayStatus(i + 1)
            const c = st ? ST[st] : null
            const I = c?.icon
            return (
              <div key={i} aria-label={`${i + 1} ${monthName(mo)}: ${c ? t(c.label) : t('No dose logged')}`} className={cx('flex aspect-square flex-col items-center justify-center rounded-control border text-small tabular', c ? c.cls : 'border-transparent text-ink-500')}>
                <span className="font-semibold">{i + 1}</span>
                {I && <I className="size-3.5" strokeWidth={2.5} aria-hidden />}
              </div>
            )
          })}
        </div>
      </Card>
      <ul className="mt-4 flex flex-wrap gap-2" aria-label={t('Legend')}>
        {(Object.keys(ST) as (keyof typeof ST)[]).map((k) => (
          <li key={k}>
            <StatusChip status={k} label={`${t(ST[k].label)}: ${counts[k]}`} />
          </li>
        ))}
      </ul>
      {counts.missed > 2 && (
        <Note tone="warning" icon={AlertTriangle} className="mt-4">
          {t('{n} missed days this month. Setting a second reminder can help.', { n: counts.missed })}
        </Note>
      )}
    </Screen>
  )
}
