import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { AlertTriangle, ArrowUpRight, Building2, CalendarClock, ClipboardList, FileText, FlaskConical, Pill, Plus, ShieldCheck, Sparkles, Upload } from 'lucide-react'
import { useApp } from '../../state/store'
import { useT } from '../../i18n'
import { Button, cx, Screen, SectionTitle } from '../../components/ui'
import { AllergyStrip, SourceLabel, StatusChip } from '../../components/status'
import { EmptyState, Loadable, Skeleton } from '../../components/states'
import { CountUp, DocThumb } from '../../components/art'
import { Sparkline } from '../../components/Sparkline'
import { useFakeLoad } from '../../mock/api'
import { age, fmtDate, fmtTime } from '../../lib/format'
import { upcoming } from '../../lib/doses'
import { gsap, useGSAP, MOTION_OK, prefersReduced } from '../../lib/motion'
import { useTilt } from '../../lib/tilt'
import { areaData, outOfRange, STATUS_WORD } from '../home/bodyAreas'
import { SECTIONS } from './Record'
import type { Profile, RecordSection, TestResult } from '../../mock/types'

const AREA_TONE = { danger: 'text-danger-text ring-danger-border', warning: 'text-warning-text ring-warning-border', success: 'text-success-text ring-success-border' }
const AREA_DOT = { danger: 'bg-danger-text', warning: 'bg-warning-text', success: 'bg-success-text' }
/** Donut slices: theme tokens only, darkest first so neighbours contrast */
const SLICE = ['#174c99', '#1d5fbf', '#067647', '#b54708', '#93370d', '#7b8ba1', '#75e0a7', '#fec84b', '#fda29b', '#d6e6fb']

/**
 * H26 Record overview (also J4 in doctor view).
 * Glass + neumorphic + skeuomorphic: a tilting health-passport card, a pressed-in completeness dial,
 * glass section cards that tilt toward the pointer, a record-makeup donut, trend cards and a glowing timeline.
 * The allergy strip never animates or tilts; blocks enter once on load, never on scroll.
 */
export function RecordOverview({ profileId: forced, doctorView }: { profileId?: string; doctorView?: boolean }) {
  const { s, profile: active, can } = useApp()
  const t = useT()
  const pid = forced ?? active.id
  const p = s.profiles.find((x) => x.id === pid) ?? active
  const { state, retry } = useFakeLoad('rec' + pid)
  const root = useRef<HTMLDivElement>(null)

  const data = useMemo(() => {
    const items = s.items.filter((i) => i.profileId === pid)
    const tests = s.tests.filter((x) => x.profileId === pid)
    const meds = s.medicines.filter((m) => m.profileId === pid && m.current)
    const docs = s.documents.filter((d) => d.profileId === pid)
    const adm = s.admissions.filter((a) => a.profileId === pid)
    const count: Partial<Record<RecordSection, number>> = {}
    for (const i of items) count[i.section] = (count[i.section] ?? 0) + 1
    count.medicines = meds.length
    count.tests = tests.length
    count.surgeries = (count.surgeries ?? 0) + adm.length
    const checks = [!!p.bloodGroup, !!count.conditions, !!count.medicines, !!count.tests, !!count.vaccinations, !!count.vitals, !!count.doctors, !!count.lifestyle]
    const complete = Math.round((checks.filter(Boolean).length / checks.length) * 100)
    return { items, tests, meds, docs, adm, count, complete }
  }, [s, pid, p.bloodGroup])
  const areas = useMemo(() => areaData(s, pid), [s, pid])
  const shown = SECTIONS.filter((x) => data.count[x.key])
  const missing = SECTIONS.filter((x) => ['conditions', 'vaccinations', 'medicines'].includes(x.key) && !data.count[x.key])
  const outs = data.tests.filter(outOfRange).length

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        gsap.from('[data-pass]', { opacity: 0, y: 40, rotateX: 18, transformPerspective: 900, duration: 0.9, ease: 'power3.out', clearProps: 'opacity,transform' })
        gsap.from('[data-neu]', { opacity: 0, y: 18, duration: 0.5, stagger: 0.06, delay: 0.15, ease: 'power2.out', clearProps: 'all' })
      })
      return () => mm.revert()
    },
    { scope: root, dependencies: [pid] },
  )
  useGSAP(
    () => {
      if (state !== 'ok') return
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        gsap.from('[data-enter]', { opacity: 0, y: 24, scale: 0.98, duration: 0.45, stagger: 0.05, ease: 'power2.out', clearProps: 'all' })
        gsap.from('[data-line]', { scaleY: 0, transformOrigin: 'top', duration: 0.9, ease: 'power2.inOut', delay: 0.3 })
      })
      return () => mm.revert()
    },
    { scope: root, dependencies: [state, pid] },
  )

  const events = [
    ...data.items.map((i) => ({ id: i.id, at: i.date, title: i.title, icon: SECTIONS.find((x) => x.key === i.section)?.icon ?? (i.section === 'allergies' ? AlertTriangle : ClipboardList), src: i.source, seed: undefined as number | undefined })),
    ...data.docs.map((d) => ({ id: d.id, at: d.date, title: d.title, icon: FileText, src: d.source, seed: d.seed as number | undefined })),
    ...data.adm.map((a) => ({ id: a.id, at: a.from, title: t('Admitted to {h}', { h: a.hospital }), icon: Building2, src: a.source, seed: undefined as number | undefined })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 5)

  const makeup = shown.map((x) => ({ key: x.key, name: t(x.label), value: data.count[x.key] ?? 0 }))
  const total = makeup.reduce((a, b) => a + b.value, 0)

  return (
    <div className="relative isolate">
      {/* Aurora wash behind the top of the page so the glass has colour to blur */}
      <div aria-hidden className="hero-aurora pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px] overflow-hidden">
        <span className="blob blob-a -top-32 right-[6%] size-[460px]" />
        <span className="blob blob-b top-24 left-[30%] size-[320px]" />
        <span className="blob blob-c -left-24 top-10 size-[380px]" />
        <div className="hero-grid absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-page" />
      </div>

      <Screen wide>
        <div ref={root} className="flex flex-col gap-8">
          {!doctorView && (
            <header className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-caption font-semibold tracking-[0.18em] text-primary-600 uppercase">{t('Health passport')}</p>
                <h1 className="text-display font-bold tracking-tight lg:text-[calc(40px*var(--ts))] lg:leading-[1.1]">{t('My Record')}</h1>
              </div>
              <div className="flex gap-2">
                <Link to="/timeline" className="glass glass-pill inline-flex min-h-12 items-center gap-2 rounded-2xl px-4 text-small font-semibold text-primary-700">
                  <CalendarClock className="size-5" strokeWidth={1.75} aria-hidden />
                  {t('Timeline')}
                </Link>
                {can('edit') && (
                  <Button icon={Plus} to="/record/add" className="rounded-2xl px-4">
                    {t('Add')}
                  </Button>
                )}
              </div>
            </header>
          )}

          {/* Passport + dial */}
          <section aria-label={t('Profile')} className="grid items-start gap-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:gap-8">
            <div className="flex flex-col gap-4">
              <PassportCard p={p} />
              {/* Allergies: outside the tilting card, never animated */}
              <AllergyStrip profileId={pid} />
            </div>

            <div data-neu className="neu flex flex-col gap-6 rounded-[28px] p-5 md:p-6">
              <div className="flex flex-col items-center gap-6 sm:flex-row">
                <CompletenessDial value={data.complete} label={t('Record complete')} />
                <dl className="grid w-full flex-1 grid-cols-2 gap-3">
                  <Stat icon={ClipboardList} label={t('Records')} value={data.items.length} />
                  <Stat icon={FileText} label={t('Documents')} value={data.docs.length} />
                  <Stat icon={Pill} label={t('Medicines')} value={data.meds.length} />
                  <Stat icon={FlaskConical} label={t('Test results')} value={data.tests.length} alert={outs > 0 ? t('{n} out of range', { n: outs }) : undefined} />
                </dl>
              </div>
              {areas.length > 0 && (
                <div>
                  <p className="mb-2 text-caption font-semibold tracking-wide text-ink-500 uppercase">{t('Body systems')}</p>
                  <ul className="flex flex-wrap gap-2">
                    {areas.map((a) => {
                      const I = a.def.icon
                      return (
                        <li key={a.def.id} className={cx('glass inline-flex min-h-10 items-center gap-2 rounded-full py-1 pr-3 pl-1 text-small font-semibold ring-1', AREA_TONE[a.status])}>
                          <span className="skeuo-icon grid size-8 place-items-center rounded-full">
                            <I className="size-4" strokeWidth={2} aria-hidden />
                          </span>
                          {t(a.def.label)}
                          <span className="inline-flex items-center gap-1 font-medium whitespace-nowrap">
                            <span className={cx('size-2 rounded-full', AREA_DOT[a.status])} aria-hidden />
                            {t(STATUS_WORD[a.status])}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          </section>

          <Loadable
            state={state}
            retry={retry}
            skeleton={
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="status" aria-label={t('Loading')}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-40 rounded-[22px]" />
                ))}
              </div>
            }
          >
            {shown.length === 0 ? (
              <EmptyState text={t('No records yet. Upload your first report.')} action={can('upload') && <Button icon={Upload} to="/upload">{t('Upload a report')}</Button>} />
            ) : (
              <section aria-label={t('Sections')}>
                <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {shown.map((sec) => (
                    <li key={sec.key} data-enter>
                      <SectionCard sectionKey={sec.key} pid={pid} count={data.count[sec.key] ?? 0} linkable={!doctorView} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Insights: what the record holds + trends */}
            {total > 0 && (
              <section aria-label={t('Insights')} className="grid gap-5 lg:grid-cols-3">
                <div data-enter className="neu flex flex-col rounded-[24px] p-5">
                  <SectionTitle>{t('Record makeup')}</SectionTitle>
                  <Makeup data={makeup} total={total} label={t('entries')} />
                </div>
                {data.tests.length > 0 && (
                  <div data-enter className="flex min-w-0 flex-col lg:col-span-2">
                    <SectionTitle>{t('Trends')}</SectionTitle>
                    <div className="no-scrollbar -mx-4 flex flex-1 snap-x gap-4 overflow-x-auto px-4 pb-2 md:-mx-6 md:px-6 lg:mx-0 lg:grid lg:grid-cols-2 lg:px-0">
                      {data.tests.map((x) => (
                        <div key={x.id} className="w-[82%] shrink-0 snap-start sm:w-[320px] lg:w-auto">
                          <TrendCard test={x} linkable={!doctorView} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              {events.length > 0 && (
                <section data-enter className="min-w-0">
                  <SectionTitle action={!doctorView && <Link to="/timeline" className="inline-flex min-h-12 items-center text-small font-semibold text-primary-600">{t('See timeline')}</Link>}>{t('Recent')}</SectionTitle>
                  <ol className="glass glass-sheen relative rounded-[24px] p-4 md:p-5">
                    <span data-line aria-hidden className="absolute top-10 bottom-10 left-[39px] w-0.5 rounded-full bg-gradient-to-b from-primary-600 via-primary-100 to-transparent md:left-[43px]" />
                    {events.map((e) => (
                      <li key={e.id} className="relative flex items-center gap-4 rounded-2xl p-2 transition-colors hover:bg-white/60">
                        <span className="skeuo-icon glow-node relative z-10 grid size-10 shrink-0 place-items-center rounded-full">
                          <e.icon className="size-5" strokeWidth={1.75} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold">{e.title}</span>
                          <span className="block text-caption text-ink-700 tabular">{fmtDate(e.at)}</span>
                          <SourceLabel source={e.src} />
                        </span>
                        {e.seed !== undefined && <DocThumb seed={e.seed} className="h-16 w-12 shrink-0 drop-shadow-md" />}
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {!doctorView && can('edit') && missing.length > 0 ? (
                <section data-enter className="min-w-0">
                  <SectionTitle>{t('Add this?')}</SectionTitle>
                  <div className="flex flex-col gap-3">
                    {missing.map((m) => (
                      <div key={m.key} className="neu flex items-center gap-3 rounded-[20px] p-3">
                        <span className="neu-inset grid size-12 shrink-0 place-items-center rounded-2xl text-primary-600">
                          <m.icon className="size-5" strokeWidth={1.75} aria-hidden />
                        </span>
                        <span className="flex-1">{t('Doctors often ask about {what}.', { what: t(m.label).toLowerCase() })}</span>
                        <Button variant="tertiary" icon={Sparkles} className="px-3" to={`/record/add?type=${m.key}`}>
                          {t('Add')}
                        </Button>
                      </div>
                    ))}
                  </div>
                </section>
              ) : (
                data.docs.length > 0 && (
                  <section data-enter className="min-w-0">
                    <SectionTitle action={!doctorView && <Link to="/documents" className="inline-flex min-h-12 items-center text-small font-semibold text-primary-600">{t('See all')}</Link>}>{t('Documents')}</SectionTitle>
                    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      {data.docs.slice(0, 6).map((d) => (
                        <li key={d.id}>
                          <DocTile id={d.id} seed={d.seed} title={d.title} date={d.date} pages={d.pages} linkable={!doctorView} />
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              )}
            </div>
          </Loadable>
        </div>
      </Screen>
    </div>
  )
}

/** A short, stable card number from the profile id: "MG 4821 0393" */
function cardNo(id: string) {
  let h = 2166136261
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0
  const n = String(h).padStart(10, '0')
  return `MG ${n.slice(0, 4)} ${n.slice(4, 8)}`
}

/** Skeuomorphic health ID card: guilloché pattern, gold chip, embossed name, holographic sheen that follows the pointer, real QR. */
function PassportCard({ p }: { p: Profile }) {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  useTilt(ref, 10)
  const ini = p.name.split(' ').map((w) => w[0]).slice(0, 2).join('')
  return (
    <div data-pass className="[perspective:1200px]">
      <div ref={ref} className="tilt passport aspect-[1.586/1] w-full rounded-[22px] p-5 sm:p-6" role="group" aria-label={t('Health passport')}>
        <div aria-hidden className="passport-guilloche absolute inset-0 -z-10" />
        <svg aria-hidden viewBox="0 0 400 80" preserveAspectRatio="none" className="absolute inset-x-0 top-[46%] -z-10 h-16 w-full opacity-25">
          <path d="M0,40 L120,40 L135,30 L150,40 L170,40 L180,56 L196,6 L212,72 L224,40 L260,40 L276,30 L292,40 L400,40" fill="none" stroke="white" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
        <div aria-hidden className="passport-holo absolute inset-0 z-10" />

        <div className="flex h-full flex-col justify-between">
          <div className="pop-sm flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-white/15 ring-1 ring-white/30 backdrop-blur">
                <ShieldCheck className="size-5" strokeWidth={2} aria-hidden />
              </span>
              <span className="leading-tight">
                <span className="block text-small font-bold tracking-wide">MedGuard</span>
                <span className="block text-caption text-white/75">{t('Health passport')}</span>
              </span>
            </div>
            <span className="passport-chip h-8 w-11 rounded-md" aria-hidden />
          </div>

          <div className="pop flex items-center gap-4">
            <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/90 text-h2 font-bold text-primary-700 shadow-lg ring-2 ring-white/60 sm:size-16">
              {ini}
            </span>
            <div className="min-w-0">
              <p className="emboss truncate text-h2 font-bold tracking-wide sm:text-h1">{p.name}</p>
              <p className="text-small text-white/80 tabular">
                {age(p.dob)} {t('years')} · {t(p.sex === 'female' ? 'Female' : p.sex === 'male' ? 'Male' : 'Other')} · {fmtDate(p.dob)}
              </p>
            </div>
          </div>

          <div className="pop-sm flex items-end justify-between gap-3">
            <div className="flex items-center gap-3">
              {p.bloodGroup && (
                <span className="flex items-center gap-2">
                  <span className="blood-drop grid size-11 place-items-center text-small font-bold text-white tabular">{p.bloodGroup}</span>
                  <span className="text-caption leading-tight text-white/75">
                    {t('Blood')}
                    <br />
                    {t('group')}
                  </span>
                </span>
              )}
              <span className="emboss font-mono text-small tracking-[0.2em] text-white/90 tabular">{cardNo(p.id)}</span>
            </div>
            <span className="rounded-lg bg-white p-1.5 shadow-md">
              <QRCodeSVG value={`medguard://p/${p.id}`} size={52} level="M" aria-label={t('My QR')} />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value, alert }: { icon: typeof Pill; label: string; value: number; alert?: string }) {
  return (
    <div className="neu-inset flex items-center gap-3 rounded-2xl p-3">
      <span className="skeuo-icon grid size-10 shrink-0 place-items-center rounded-xl">
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0">
        <dt className="truncate text-caption text-ink-700">{label}</dt>
        <dd className="text-h1 leading-none font-bold text-ink-900 tabular">
          <CountUp value={value} />
          {alert && (
            <span className="mt-1 flex items-center gap-1 text-caption font-semibold text-danger-text">
              <AlertTriangle className="size-3" strokeWidth={2.5} aria-hidden />
              {alert}
            </span>
          )}
        </dd>
      </div>
    </div>
  )
}

/** Neumorphic dial: an extruded disc, a pressed-in track, a gradient arc that sweeps in (anime.js) and tick marks. */
function CompletenessDial({ value, label }: { value: number; label: string }) {
  const ring = useRef<SVGCircleElement>(null)
  const R = 40
  const C = 2 * Math.PI * R
  useEffect(() => {
    const el = ring.current
    if (!el || prefersReduced()) return
    let stop: (() => void) | undefined
    import('animejs').then(({ animate }) => {
      const a = animate(el, { strokeDashoffset: [C, C * (1 - value / 100)], duration: 1400, ease: 'outExpo' })
      stop = () => a.revert()
    })
    return () => stop?.()
  }, [value, C])
  return (
    <figure className="neu relative grid size-44 shrink-0 place-items-center rounded-full" aria-label={`${label}: ${value}%`}>
      <svg viewBox="0 0 100 100" className="absolute inset-3 -rotate-90" aria-hidden>
        <defs>
          <linearGradient id="dial" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--color-success-text)" />
            <stop offset="1" stopColor="var(--color-primary-600)" />
          </linearGradient>
        </defs>
        {Array.from({ length: 40 }, (_, i) => (
          <line key={i} x1="50" y1="2" x2="50" y2={i % 5 ? 5 : 7} stroke="var(--color-border-input)" strokeWidth="0.6" opacity="0.5" transform={`rotate(${i * 9} 50 50)`} />
        ))}
        <circle cx="50" cy="50" r={R} fill="none" stroke="var(--color-primary-50)" strokeWidth="9" />
        <circle ref={ring} cx="50" cy="50" r={R} fill="none" stroke="url(#dial)" strokeWidth="9" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - value / 100)} style={{ filter: 'drop-shadow(0 2px 3px rgb(29 95 191 / 0.35))' }} />
      </svg>
      <figcaption className="neu-inset relative grid size-24 place-items-center rounded-full text-center">
        <span>
          <span className="block text-h1 leading-none font-bold text-primary-700 tabular">
            <CountUp value={value} />%
          </span>
          <span className="mt-1 block max-w-[80px] text-caption leading-tight text-ink-700">{label}</span>
        </span>
      </figcaption>
    </figure>
  )
}

/** Donut of entries per section with a legend; recharts animates the sweep unless reduced motion is on. */
function Makeup({ data, total, label }: { data: { key: string; name: string; value: number }[]; total: number; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-4 sm:flex-row lg:flex-col xl:flex-row">
      <div className="relative size-44 shrink-0" role="img" aria-label={data.map((d) => `${d.name} ${d.value}`).join(', ')}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="100%" paddingAngle={3} cornerRadius={6} stroke="none" isAnimationActive={!prefersReduced()} animationDuration={1100}>
              {data.map((d, i) => (
                <Cell key={d.key} fill={SLICE[i % SLICE.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e3e9f1', fontSize: 14 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="neu-inset pointer-events-none absolute inset-[26%] grid place-items-center rounded-full text-center">
          <span>
            <span className="block text-h1 leading-none font-bold tabular">
              <CountUp value={total} />
            </span>
            <span className="text-caption text-ink-700">{label}</span>
          </span>
        </div>
      </div>
      <ul className="grid w-full gap-1.5 text-small">
        {data.map((d, i) => (
          <li key={d.key} className="flex items-center gap-2">
            <span className="size-3 shrink-0 rounded-[4px]" style={{ background: SLICE[i % SLICE.length] }} aria-hidden />
            <span className="min-w-0 flex-1 truncate text-ink-700">{d.name}</span>
            <span className="font-semibold tabular">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Glass trend card with the sparkline sunk into a neumorphic well. */
export function TrendCard({ test, linkable }: { test: TestResult; linkable: boolean }) {
  const t = useT()
  const ref = useRef<HTMLAnchorElement & HTMLDivElement>(null)
  useTilt(ref, 5)
  const last = test.points[test.points.length - 1]
  const prev = test.points[test.points.length - 2]
  const out = outOfRange(test)
  const diff = prev ? +(last.value - prev.value).toFixed(1) : 0
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="line-clamp-2 text-small text-ink-700">{t(test.name)}</p>
          <p className={cx('text-display font-bold tabular', out && 'text-danger-text')}>
            <CountUp value={last.value} decimals={last.value % 1 ? 1 : 0} /> <span className="text-small font-semibold">{test.unit}</span>
          </p>
        </div>
        {out ? <StatusChip status="missed" label={t('Out of range')} /> : <StatusChip status="taken" label={t('In range')} />}
      </div>
      <div className="neu-inset mt-3 rounded-2xl p-2">
        <Sparkline points={test.points} low={test.low} high={test.high} unit={test.unit} height={64} />
      </div>
      <p className="mt-2 flex items-center justify-between text-caption text-ink-700 tabular">
        <span>{fmtDate(last.date)}</span>
        {prev && (
          <span className={cx('rounded-full px-2 py-0.5 font-semibold', diff === 0 ? 'bg-neutral-bg' : 'bg-primary-50 text-primary-700')}>
            {diff > 0 ? '▲' : diff < 0 ? '▼' : '•'} {Math.abs(diff)} {t('since last')}
          </span>
        )}
      </p>
    </>
  )
  const cls = 'tilt glass glass-sheen block h-full rounded-[22px] p-4'
  return linkable ? (
    <Link ref={ref} to={`/record/tests/${test.id}`} className={cls}>
      {inner}
    </Link>
  ) : (
    <div ref={ref} className={cls}>
      {inner}
    </div>
  )
}

/** Paper-like document tile that lifts on hover. */
function DocTile({ id, seed, title, date, pages, linkable }: { id: string; seed: number; title: string; date: string; pages: number; linkable: boolean }) {
  const t = useT()
  const inner = (
    <>
      <div className="neu-inset grid place-items-center rounded-2xl p-3">
        <DocThumb seed={seed} className="h-28 w-auto drop-shadow-lg transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-0" />
      </div>
      <p className="mt-2 line-clamp-1 text-small font-semibold">{title}</p>
      <p className="text-caption text-ink-700 tabular">
        {fmtDate(date)} · {t('{n} pages', { n: pages })}
      </p>
    </>
  )
  return linkable ? (
    <Link to={`/documents/${id}`} className="group neu neu-press block rounded-[20px] p-2">
      {inner}
    </Link>
  ) : (
    <div className="neu block rounded-[20px] p-2">{inner}</div>
  )
}

/** One section as a card: icon, count, latest entry, and a mini trend for test results. A soft spotlight follows the pointer. */
function SectionCard({ sectionKey, pid, count, linkable }: { sectionKey: RecordSection; pid: string; count: number; linkable: boolean }) {
  const { s } = useApp()
  const t = useT()
  const meta = SECTIONS.find((x) => x.key === sectionKey)!
  const I = meta.icon
  let body: ReactNode = null
  let badge: ReactNode = null

  if (sectionKey === 'tests') {
    const tests = s.tests.filter((x) => x.profileId === pid)
    const outs = tests.filter(outOfRange)
    const lead = outs[0] ?? tests[0]
    const last = lead.points[lead.points.length - 1]
    badge = outs.length ? <StatusChip status="missed" label={t('{n} out of range', { n: outs.length })} /> : <StatusChip status="taken" label={t('In range')} />
    body = (
      <>
        <p className="text-small text-ink-700">{t(lead.name)}</p>
        <p className={cx('font-semibold tabular', outOfRange(lead) && 'text-danger-text')}>
          {last.value} {lead.unit} · {fmtDate(last.date)}
        </p>
        <div className="mt-2">
          <Sparkline points={lead.points} low={lead.low} high={lead.high} unit={lead.unit} height={44} />
        </div>
      </>
    )
  } else if (sectionKey === 'medicines') {
    const next = upcoming(s, pid)[0]
    const meds = s.medicines.filter((m) => m.profileId === pid && m.current)
    badge = next ? <StatusChip status={next.status} /> : null
    body = (
      <>
        <p className="font-semibold">{meds.map((m) => m.name).join(', ')}</p>
        {next && <p className="text-small text-ink-700 tabular">{t('Next')}: {next.med.name} {next.med.dose}, {fmtTime(next.due)}</p>}
      </>
    )
  } else {
    const items = s.items.filter((i) => i.profileId === pid && i.section === sectionKey).sort((a, b) => b.date.localeCompare(a.date))
    const adm = sectionKey === 'surgeries' ? s.admissions.filter((a) => a.profileId === pid) : []
    const latest = items[0]
    body = latest ? (
      <>
        <p className="font-semibold">{latest.title}</p>
        {latest.detail && <p className="line-clamp-1 text-small text-ink-700">{latest.detail}</p>}
        <SourceLabel source={latest.source} className="mt-1" />
      </>
    ) : adm[0] ? (
      <>
        <p className="font-semibold">{adm[0].hospital}</p>
        <p className="text-small text-ink-700">{adm[0].ward} · {fmtDate(adm[0].from)}</p>
      </>
    ) : null
  }

  const ref = useRef<HTMLAnchorElement & HTMLDivElement>(null)
  useTilt(ref, 6)
  const inner = (
    <>
      <div className="flex items-start gap-3">
        <span className="skeuo-icon pop grid size-14 shrink-0 place-items-center rounded-2xl transition-transform duration-300 group-hover:-rotate-6">
          <I className="size-6" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-h3 font-semibold">{t(meta.label)}</p>
          <p className="text-small text-ink-700 tabular">
            <span className="text-h2 font-bold text-primary-700">
              <CountUp value={count} />
            </span>{' '}
            {t('items')}
          </p>
        </div>
        {linkable && (
          <span className="neu grid size-10 shrink-0 place-items-center rounded-full text-ink-500 transition-colors group-hover:text-primary-600">
            <ArrowUpRight className="size-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
          </span>
        )}
      </div>
      {badge && <div className="mt-3">{badge}</div>}
      {body && <div className="pop-sm mt-4 rounded-2xl border border-white/70 bg-white/55 p-3">{body}</div>}
    </>
  )
  const cls = 'tilt spotlight glass glass-sheen group relative block h-full rounded-[22px] p-4 md:p-5'
  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }
  if (!linkable)
    return (
      <div ref={ref} className={cls}>
        {inner}
      </div>
    )
  return (
    <Link ref={ref} to={sectionKey === 'medicines' ? '/medicines' : `/record/${sectionKey}`} onPointerMove={onMove} className={cls} style={{ '--mx': '50%', '--my': '0px' } as CSSProperties}>
      {inner}
    </Link>
  )
}
