import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, BellRing, CalendarRange, Clock, Droplet, Minus, Moon, Plus, Soup, Stethoscope, Sun, Sunrise, Sunset, UtensilsCrossed, Wind, X } from 'lucide-react'
import { useApp, uid } from '../../state/store'
import { useT } from '../../i18n'
import { ActionBar, Button, cx, Input, Note } from '../../components/ui'
import { Panel, Segmented } from '../../components/glass'
import { fmtDate, fmtHHMM } from '../../lib/format'
import { gsap, useGSAP, MOTION_OK } from '../../lib/motion'
import type { Medicine, MedForm } from '../../mock/types'

const FORMS: { v: MedForm; l: string }[] = [
  { v: 'tablet', l: 'Tablet' },
  { v: 'capsule', l: 'Capsule' },
  { v: 'syrup', l: 'Syrup' },
  { v: 'injection', l: 'Injection' },
  { v: 'drops', l: 'Drops' },
  { v: 'inhaler', l: 'Inhaler' },
]
const UNITS: Record<MedForm, string[]> = {
  tablet: ['mg', 'mcg', 'g'],
  capsule: ['mg', 'mcg', 'g'],
  syrup: ['ml', 'mg'],
  injection: ['ml', 'units', 'mg'],
  drops: ['drops', 'ml'],
  inhaler: ['puffs', 'mcg'],
}
const PRESET: Record<number, string[]> = { 1: ['08:00'], 2: ['08:00', '20:00'], 3: ['08:00', '14:00', '20:00'], 4: ['08:00', '12:00', '16:00', '20:00'] }
const COMMON = ['Metformin', 'Amlodipine', 'Atorvastatin', 'Omeprazole', 'Paracetamol', 'Losartan', 'Aspirin', 'Salbutamol']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DURATIONS = [
  { v: '0', l: 'Ongoing' },
  { v: '7', l: '7 days' },
  { v: '14', l: '14 days' },
  { v: '30', l: '30 days' },
  { v: '90', l: '3 months' },
]

/** Time of day for a "HH:MM" string: icon + word. */
function partOfDay(tm: string) {
  const h = Number(tm.slice(0, 2))
  if (h >= 5 && h < 11) return { icon: Sunrise, l: 'Morning' }
  if (h >= 11 && h < 16) return { icon: Sun, l: 'Afternoon' }
  if (h >= 16 && h < 20) return { icon: Sunset, l: 'Evening' }
  return { icon: Moon, l: 'Night' }
}

/** Does this medicine name clash with a recorded allergy? Penicillin family by "-cillin", otherwise a plain name match. */
export function allergyClash(name: string, allergies: string[]) {
  const n = name.trim().toLowerCase()
  if (n.length < 3) return undefined
  return allergies.find((a) => {
    const x = a.toLowerCase()
    return (/penicillin/.test(x) && /cillin/.test(n)) || (x.length >= 4 && (n.includes(x) || x.includes(n)))
  })
}

/**
 * H24 for medicines: a four-step builder (what, how much, when, reminders) with a live skeuomorphic bottle
 * and a 24-hour dial. Saves a Medicine with every time, food rule, course length and reminder days.
 * The allergy warning is a static Note and also marks the preview label; it never animates.
 */
export function MedicineBuilder({ tiles }: { tiles: ReactNode }) {
  const { profile, s, mutate, toast, queueIfOffline } = useApp()
  const t = useT()
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [form, setForm] = useState<MedForm>('tablet')
  const [amount, setAmount] = useState('500')
  const [unit, setUnit] = useState('mg')
  const [count, setCount] = useState(1)
  const [times, setTimes] = useState<string[]>(PRESET[1])
  const [food, setFood] = useState<Medicine['food']>('after')
  const [duration, setDuration] = useState('0')
  const [remind, setRemind] = useState(true)
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
  const [by, setBy] = useState('')
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10))
  const [err, setErr] = useState<{ name?: string; amount?: string }>({})

  const allergies = s.items.filter((i) => i.profileId === profile.id && i.section === 'allergies').map((i) => i.title)
  const clash = allergyClash(name, allergies)
  const dose = amount ? `${amount} ${unit}` : ''
  const sorted = [...times].sort()

  const setFreq = (n: number) => {
    setCount(n)
    setTimes(PRESET[n])
  }
  const setFormKeepUnit = (f: MedForm) => {
    setForm(f)
    if (!UNITS[f].includes(unit)) setUnit(UNITS[f][0])
  }
  const step = (d: number) => {
    const v = Number(amount) || 0
    const inc = v >= 100 ? 50 : v >= 10 ? 5 : 1
    setAmount(String(Math.max(0, v + d * inc)))
  }

  const summary = [
    dose && `${dose}`,
    t(count === 1 ? 'once a day' : count === 2 ? 'twice a day' : '{n} times a day', { n: count }),
    t(food === 'after' ? 'after food' : food === 'before' ? 'before food' : 'with or without food'),
    duration === '0' ? t('ongoing') : t('for {n} days', { n: duration }),
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-6">
        {tiles}

        <form
          className="flex flex-col gap-6"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            const er = { name: name.trim() ? undefined : t('Fill in this field.'), amount: Number(amount) > 0 ? undefined : t('Fill in this field.') }
            setErr(er)
            if (er.name || er.amount) return
            const now = new Date().toISOString()
            mutate((d) => {
              d.medicines.push({
                id: uid('med'),
                profileId: profile.id,
                name: name.trim(),
                dose,
                form,
                times: sorted,
                food,
                prescribedBy: by.trim() || t('Entered by you'),
                start,
                current: true,
                source: { kind: 'self', by: 'you', at: now },
                reminder: { on: remind, days, durationDays: duration === '0' ? undefined : Number(duration), sound: 'Chime', tellCaregivers: false },
              })
            })
            toast(queueIfOffline('Add medicine') ? t('Saved on this phone. Will sync when online.') : t('{med} added. Reminders are set.', { med: name.trim() }))
            nav('/medicines')
          }}
        >
          {/* 1. What */}
          <Step n={1} title={t('What is it?')}>
            <Input label={t('Medicine name')} list="common-meds" value={name} onChange={(e) => setName(e.target.value)} error={err.name} placeholder="Metformin" autoComplete="off" />
            <datalist id="common-meds">
              {COMMON.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" aria-label={t('Common medicines')}>
              {COMMON.map((c) => (
                <button key={c} type="button" onClick={() => setName(c)} className={cx('glass glass-pill min-h-9 shrink-0 rounded-full px-3 text-small font-semibold', name === c ? 'text-primary-700 ring-2 ring-primary-600' : 'text-ink-700')}>
                  {c}
                </button>
              ))}
            </div>
            {clash && (
              <Note tone="danger" icon={AlertTriangle}>
                {t('{name} is allergic to {allergy}. Check with a doctor before taking this.', { name: profile.name, allergy: clash })}
              </Note>
            )}
            <p className="text-small font-semibold text-ink-700">{t('Form')}</p>
            <div role="radiogroup" aria-label={t('Form')} className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {FORMS.map((f) => {
                const on = form === f.v
                return (
                  <button key={f.v} type="button" role="radio" aria-checked={on} onClick={() => setFormKeepUnit(f.v)} className={cx('group flex min-h-24 flex-col items-center justify-center gap-2 rounded-[18px] p-2 transition-all', on ? 'neu-inset ring-2 ring-primary-600' : 'neu neu-press')}>
                    <FormGlyph form={f.v} on={on} />
                    <span className={cx('text-small font-semibold', on ? 'text-primary-700' : 'text-ink-700')}>{t(f.l)}</span>
                  </button>
                )
              })}
            </div>
          </Step>

          {/* 2. How much */}
          <Step n={2} title={t('How much?')}>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="dose-amt" className="text-small font-semibold text-ink-700">
                  {t('Dose')}
                </label>
                <div className="neu-inset flex items-center gap-1 rounded-2xl p-1">
                  <button type="button" aria-label={t('Less')} onClick={() => step(-1)} className="neu neu-press grid size-11 place-items-center rounded-xl text-primary-700">
                    <Minus className="size-5" strokeWidth={2.5} />
                  </button>
                  <input
                    id="dose-amt"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                    aria-invalid={!!err.amount}
                    className="w-20 bg-transparent text-center text-h1 font-bold tabular outline-none focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-primary-600"
                  />
                  <button type="button" aria-label={t('More')} onClick={() => step(1)} className="neu neu-press grid size-11 place-items-center rounded-xl text-primary-700">
                    <Plus className="size-5" strokeWidth={2.5} />
                  </button>
                </div>
                {err.amount && <p className="text-small font-semibold text-danger-text">{err.amount}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-small font-semibold text-ink-700">{t('Unit')}</span>
                <Segmented label={t('Unit')} value={unit} onChange={setUnit} options={UNITS[form].map((u) => ({ value: u, label: u }))} />
              </div>
            </div>
          </Step>

          {/* 3. When */}
          <Step n={3} title={t('When?')}>
            <Segmented
              label={t('How often')}
              value={String(count)}
              onChange={(v) => setFreq(Number(v))}
              options={[
                { value: '1', label: t('Once a day') },
                { value: '2', label: t('Twice') },
                { value: '3', label: t('3 times') },
                { value: '4', label: t('4 times') },
              ]}
              className="self-start"
            />
            <ul className="grid gap-3 sm:grid-cols-2">
              {times.map((tm, i) => {
                const P = partOfDay(tm)
                return (
                  <li key={i} className="glass flex items-center gap-3 rounded-2xl p-2 pl-3">
                    <span className="skeuo-icon grid size-10 shrink-0 place-items-center rounded-xl">
                      <P.icon className="size-5" strokeWidth={1.75} aria-hidden />
                    </span>
                    <label className="min-w-0 flex-1">
                      <span className="block text-caption text-ink-700">
                        {t('Dose {n}', { n: i + 1 })} · {t(P.l)}
                      </span>
                      <input
                        type="time"
                        value={tm}
                        onChange={(e) => setTimes(times.map((x, j) => (j === i ? e.target.value : x)))}
                        className="w-full bg-transparent text-h3 font-bold tabular outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-primary-600"
                      />
                    </label>
                    {times.length > 1 && (
                      <button
                        type="button"
                        aria-label={t('Remove this time')}
                        onClick={() => {
                          const next = times.filter((_, j) => j !== i)
                          setTimes(next)
                          setCount(next.length)
                        }}
                        className="grid size-10 place-items-center rounded-xl text-ink-500 hover:bg-white/70 hover:text-danger-text"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
            <p className="text-small font-semibold text-ink-700">{t('With food?')}</p>
            <div role="radiogroup" aria-label={t('With food?')} className="grid grid-cols-3 gap-3">
              {([
                { v: 'before', l: 'Before food', icon: Soup },
                { v: 'after', l: 'After food', icon: UtensilsCrossed },
                { v: 'any', l: 'Any time', icon: Clock },
              ] as const).map((o) => {
                const on = food === o.v
                return (
                  <button key={o.v} type="button" role="radio" aria-checked={on} onClick={() => setFood(o.v)} className={cx('flex min-h-20 flex-col items-center justify-center gap-1 rounded-[18px] p-2 text-center transition-all', on ? 'neu-inset ring-2 ring-primary-600' : 'neu neu-press')}>
                    <o.icon className={cx('size-6', on ? 'text-primary-600' : 'text-ink-500')} strokeWidth={1.75} aria-hidden />
                    <span className={cx('text-small font-semibold', on ? 'text-primary-700' : 'text-ink-700')}>{t(o.l)}</span>
                  </button>
                )
              })}
            </div>
          </Step>

          {/* 4. Course + reminders */}
          <Step n={4} title={t('Course and reminders')}>
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-2 text-small font-semibold text-ink-700">
                <CalendarRange className="size-4" aria-hidden /> {t('How long?')}
              </span>
              <Segmented label={t('How long?')} value={duration} onChange={setDuration} options={DURATIONS.map((d) => ({ value: d.v, label: t(d.l) }))} className="self-start" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={t('Start date')} type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              <Input label={t('Prescribed by (optional)')} value={by} onChange={(e) => setBy(e.target.value)} placeholder="Dr. Karim Hossain" />
            </div>
            <div className="neu-inset flex items-center gap-3 rounded-2xl p-3">
              <span className="skeuo-icon grid size-10 shrink-0 place-items-center rounded-xl">
                <BellRing className="size-5" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="flex-1">
                <span id="rem-l" className="block font-semibold">
                  {t('Remind me')}
                </span>
                <span className="block text-small text-ink-700">{remind ? t('A reminder at each dose time.') : t('No reminders.')}</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={remind}
                aria-labelledby="rem-l"
                onClick={() => setRemind(!remind)}
                className={cx('relative h-8 w-14 shrink-0 rounded-full transition-colors', remind ? 'bg-primary-600' : 'bg-border-input')}
              >
                <span className={cx('absolute top-1 size-6 rounded-full bg-white shadow-md transition-transform', remind ? 'translate-x-7' : 'translate-x-1')} />
              </button>
            </div>
            {remind && (
              <div role="group" aria-label={t('Days')} className="flex flex-wrap gap-2">
                {DAYS.map((d, i) => {
                  const on = days.includes(i)
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setDays(on ? (days.length > 1 ? days.filter((x) => x !== i) : days) : [...days, i].sort())}
                      className={cx('grid size-12 place-items-center rounded-2xl text-small font-bold transition-all', on ? 'skeuo-icon' : 'neu neu-press text-ink-700')}
                    >
                      {t(d)}
                    </button>
                  )
                })}
              </div>
            )}
          </Step>

          <ActionBar>
            <Button full type="submit" icon={Plus}>
              {t('Add medicine')}
            </Button>
          </ActionBar>
        </form>
      </div>

      <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
        <Panel neu title={t('Preview')}>
          <Bottle name={name || t('Medicine name')} dose={dose} form={form} times={sorted} food={food} clash={clash} empty={!name} />
          <p className="mt-4 text-center text-small font-semibold text-ink-700">{summary}</p>
        </Panel>
        <Panel title={t('Your day')}>
          <DayDial times={sorted} />
          <p className="mt-3 text-center text-small text-ink-700">
            {t('Starts {date}', { date: fmtDate(start) })}
            {remind && days.length < 7 && <> · {days.map((d) => t(DAYS[d])).join(', ')}</>}
          </p>
        </Panel>
        <div className="glass flex gap-3 rounded-[20px] p-4 text-small text-ink-700">
          <Stethoscope className="size-5 shrink-0 text-primary-600" aria-hidden />
          <p>{t('Only add what a doctor told you to take. MedGuard reminds you; it does not decide doses.')}</p>
        </div>
      </aside>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section data-rise className="glass glass-sheen flex flex-col gap-4 rounded-[24px] p-4 md:p-6" aria-labelledby={`step-${n}`}>
      <h2 id={`step-${n}`} className="flex items-center gap-3 text-h3 font-semibold">
        <span className="skeuo-icon grid size-8 shrink-0 place-items-center rounded-full text-small font-bold">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

/** Small drawn icon per medicine form (CSS/SVG, theme colours). */
function FormGlyph({ form, on }: { form: MedForm; on: boolean }) {
  const a = on ? 'var(--color-primary-600)' : 'var(--color-border-input)'
  const b = on ? 'var(--color-primary-100)' : 'var(--color-neutral-bg)'
  const common = 'transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110'
  if (form === 'tablet')
    return (
      <span aria-hidden className={cx('relative grid size-9 place-items-center rounded-full shadow-[inset_0_-3px_5px_rgba(15,27,45,0.18),0_3px_6px_rgba(15,27,45,0.18)]', common)} style={{ background: `radial-gradient(circle at 35% 30%, white, ${b})` }}>
        <span className="h-0.5 w-6 rounded-full" style={{ background: a }} />
      </span>
    )
  if (form === 'capsule')
    return (
      <span aria-hidden className={cx('flex h-4 w-10 -rotate-45 overflow-hidden rounded-full shadow-[0_3px_6px_rgba(15,27,45,0.25)]', common)}>
        <span className="w-1/2" style={{ background: `linear-gradient(180deg, ${a}, color-mix(in oklab, ${a} 70%, var(--color-ink-900)))` }} />
        <span className="w-1/2" style={{ background: `linear-gradient(180deg, white, ${b})` }} />
      </span>
    )
  if (form === 'syrup')
    return (
      <span aria-hidden className={cx('relative flex flex-col items-center', common)}>
        <span className="h-2 w-4 rounded-t-sm" style={{ background: a }} />
        <span className="h-7 w-7 rounded-lg shadow-[inset_0_-6px_0_rgba(255,255,255,0.25)]" style={{ background: `linear-gradient(160deg, ${a}, color-mix(in oklab, ${a} 60%, var(--color-ink-900)))` }} />
      </span>
    )
  if (form === 'injection')
    return (
      <span aria-hidden className={cx('flex -rotate-45 items-center', common)}>
        <span className="h-2 w-2" style={{ background: a }} />
        <span className="h-3 w-6 rounded-sm border-2" style={{ borderColor: a, background: b }} />
        <span className="h-0.5 w-3" style={{ background: a }} />
      </span>
    )
  if (form === 'drops') return <Droplet aria-hidden className={cx('size-8', common)} style={{ color: a, fill: b }} strokeWidth={1.75} />
  return <Wind aria-hidden className={cx('size-8', common)} style={{ color: a }} strokeWidth={1.75} />
}

/** Skeuomorphic pill bottle: glass body, ribbed cap, paper label with the live name/dose/schedule. Wobbles once when the name changes. */
function Bottle({ name, dose, form, times, food, clash, empty }: { name: string; dose: string; form: MedForm; times: string[]; food: Medicine['food']; clash?: string; empty: boolean }) {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(MOTION_OK, () => {
      gsap.fromTo(ref.current, { rotate: -3, y: -4 }, { rotate: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' })
    })
    return () => mm.revert()
  }, [name, form])
  const liquid = form === 'syrup' || form === 'drops' || form === 'injection'
  const body = liquid ? 'linear-gradient(90deg, #174c99, #1d5fbf 35%, #174c99)' : 'linear-gradient(90deg, #93370d, #b54708 30%, #fec84b 48%, #b54708 62%, #93370d)'
  return (
    <div className="flex justify-center pt-2 pb-4" aria-hidden>
      <div ref={ref} className="relative w-44 origin-bottom">
        {/* cap */}
        <div className="mx-auto h-9 w-32 rounded-t-xl rounded-b-md bg-[repeating-linear-gradient(90deg,#ffffff_0_5px,#e3e9f1_5px_7px)] shadow-[inset_0_-4px_6px_rgba(15,27,45,0.18),0_2px_3px_rgba(15,27,45,0.2)]" />
        <div className="mx-auto h-2 w-28 bg-[#d6e6fb]" />
        {/* body */}
        <div className="relative h-64 overflow-hidden rounded-[26px] shadow-[0_24px_40px_-18px_rgba(15,27,45,0.55)]" style={{ background: body }}>
          <span aria-hidden className="absolute inset-y-3 left-3 w-3 rounded-full bg-white/35 blur-[1px]" />
          {/* label */}
          <div className={cx('absolute inset-x-3 top-6 bottom-6 flex flex-col gap-0.5 rounded-xl [&>*]:shrink-0 bg-[linear-gradient(180deg,#ffffff,#f5f8fc)] p-3 shadow-[0_2px_6px_rgba(15,27,45,0.25)]', clash && 'ring-4 ring-danger-text')}>
            <p className="text-[9px] font-bold tracking-[0.2em] text-primary-600 uppercase">MedGuard Rx</p>
            <p className={cx('mt-1 line-clamp-2 text-body leading-snug font-bold break-words', empty ? 'text-ink-500 italic' : 'text-ink-900')}>{name}</p>
            <p className="text-small font-semibold text-primary-700 tabular">{dose || '—'}</p>
            <div className="mt-auto flex flex-wrap gap-1">
              {times.slice(0, 4).map((tm, i) => (
                <span key={i} className="rounded bg-primary-50 px-1 text-[10px] font-semibold text-primary-700 tabular">
                  {fmtHHMM(tm)}
                </span>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-ink-700">{t(food === 'after' ? 'After food' : food === 'before' ? 'Before food' : 'Any time')}</p>
            {clash && (
              <p className="mt-1 flex items-center gap-1 rounded bg-danger-bg px-1 text-[10px] font-bold text-danger-text">
                <AlertTriangle className="size-3" aria-hidden /> {t('Allergy')}
              </p>
            )}
          </div>
        </div>
        <span aria-hidden className="absolute -bottom-3 left-1/2 h-4 w-40 -translate-x-1/2 rounded-[50%] bg-ink-900/15 blur-md" />
      </div>
    </div>
  )
}

/** 24-hour dial: day/night halves, hour ticks, a glossy marker per dose and its time. */
function DayDial({ times }: { times: string[] }) {
  const pts = useMemo(
    () =>
      times.map((tm) => {
        const m = Number(tm.slice(0, 2)) * 60 + Number(tm.slice(3, 5))
        const a = (m / 1440) * Math.PI * 2 - Math.PI / 2
        return { tm, x: 100 + Math.cos(a) * 70, y: 100 + Math.sin(a) * 70, lx: 100 + Math.cos(a) * 94, ly: 100 + Math.sin(a) * 94 }
      }),
    [times],
  )
  return (
    <svg viewBox="-10 -10 220 220" className="mx-auto w-full max-w-[260px]" role="img" aria-label={times.map(fmtHHMM).join(', ')}>
      <defs>
        <linearGradient id="dd-day" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#fef0c7" />
          <stop offset="1" stopColor="#fffaeb" />
        </linearGradient>
        <radialGradient id="dd-dot" cx="0.35" cy="0.3">
          <stop offset="0" stopColor="#1d5fbf" />
          <stop offset="1" stopColor="#174c99" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="82" fill="#eaf2fd" />
      {/* 00:00 at the top; daylight 06:00–18:00 is the lower half */}
      <path d="M100,100 L182,100 A82,82 0 0 1 18,100 Z" fill="url(#dd-day)" />
      <circle cx="100" cy="100" r="82" fill="none" stroke="#d6e6fb" strokeWidth="2" />
      {Array.from({ length: 24 }, (_, h) => {
        const a = (h / 24) * Math.PI * 2 - Math.PI / 2
        const r1 = h % 6 ? 76 : 72
        return <line key={h} x1={100 + Math.cos(a) * r1} y1={100 + Math.sin(a) * r1} x2={100 + Math.cos(a) * 82} y2={100 + Math.sin(a) * 82} stroke="#7b8ba1" strokeWidth={h % 6 ? 1 : 2} opacity="0.6" />
      })}
      {[
        ['00', 100, 34],
        ['06', 166, 104],
        ['12', 100, 172],
        ['18', 34, 104],
      ].map(([l, x, y]) => (
        <text key={l} x={x} y={y} textAnchor="middle" fontSize="11" fontWeight="700" fill="#5b6b80">
          {l}
        </text>
      ))}
      <circle cx="100" cy="100" r="26" fill="#ffffff" stroke="#e3e9f1" />
      <text x="100" y="98" textAnchor="middle" fontSize="18" fontWeight="800" fill="#174c99">
        {times.length}×
      </text>
      <text x="100" y="112" textAnchor="middle" fontSize="8" fill="#475467">
        / 24h
      </text>
      {pts.map((p, i) => (
        <g key={i}>
          <line x1="100" y1="100" x2={p.x} y2={p.y} stroke="#1d5fbf" strokeWidth="1.5" strokeDasharray="2 3" opacity="0.5" />
          <circle cx={p.x} cy={p.y} r="9" fill="url(#dd-dot)" stroke="#ffffff" strokeWidth="3" />
          <text x={p.lx} y={p.ly + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#0f1b2d">
            {fmtHHMM(p.tm)}
          </text>
        </g>
      ))}
    </svg>
  )
}

