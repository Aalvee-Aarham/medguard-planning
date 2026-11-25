import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, BellRing, CalendarDays, Check, ChevronLeft, ChevronRight, Clock, FileText, Minus, Pill, Plus, X } from 'lucide-react'
import { useApp } from '../../state/store'
import { useT } from '../../i18n'
import { ActionBar, Button, Card, cx, Input, List, ListRow, Note, PageHeader, Screen, SectionTitle, Select, Stack, Tabs, Toggle } from '../../components/ui'
import { AllergyStrip, SourceLabel, StatusChip } from '../../components/status'
import { EmptyState, Loadable } from '../../components/states'
import { CheckDraw } from '../../components/CheckDraw'
import { useFakeLoad } from '../../mock/api'
import { fmtDate, fmtHHMM, fmtTime, monthName } from '../../lib/format'
import { logDose, upcoming } from '../../lib/doses'

const foodLabel = (f: string) => (f === 'after' ? 'After food' : f === 'before' ? 'Before food' : 'With or without food')

/** H34 Medicines: Current / Past tabs */
export function MedicineList() {
  const { s, profile, can } = useApp()
  const t = useT()
  const [tab, setTab] = useState<'current' | 'past'>('current')
  const { state, retry } = useFakeLoad('meds')
  const list = s.medicines.filter((m) => m.profileId === profile.id && m.current === (tab === 'current'))
  const up = upcoming(s, profile.id)
  return (
    <Screen>
      <PageHeader title={t('Medicines')} action={can('edit') && <Button variant="tertiary" icon={Plus} to="/record/add?type=medicines" className="px-3">{t('Add')}</Button>} />
      <AllergyStrip profileId={profile.id} />
      <div className="mt-4">
        <Tabs label={t('Medicines')} value={tab} onChange={setTab} tabs={[{ value: 'current', label: t('Current') }, { value: 'past', label: t('Past') }]} />
      </div>
      <Loadable state={state} retry={retry}>
        {list.length ? (
          <List className="mt-4">
            {list.map((m) => {
              const u = up.find((x) => x.med.id === m.id)
              return (
                <ListRow
                  key={m.id}
                  icon={Pill}
                  title={
                    <>
                      {m.name} <span className="tabular">{m.dose}</span>
                    </>
                  }
                  sub={tab === 'current' ? (u ? <span className="tabular">{t('Next')}: {fmtTime(u.due)}</span> : t('Reminders off')) : t('Stopped {date}', { date: fmtDate(m.end ?? m.start) })}
                  to={`/medicines/${m.id}`}
                  right={tab === 'current' ? u ? <StatusChip status={u.status} /> : <StatusChip status="skipped" label={t('Off')} /> : <StatusChip status="expired" label={t('Past')} />}
                />
              )
            })}
          </List>
        ) : (
          <div className="mt-4">
            <EmptyState art="pills" text={tab === 'current' ? t('No current medicines. Add one or upload a prescription.') : t('No past medicines.')} action={tab === 'current' && can('upload') && <Button to="/upload">{t('Upload a prescription')}</Button>} />
          </div>
        )}
      </Loadable>
    </Screen>
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
