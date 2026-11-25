import { forwardRef, useRef } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowUpRight, ClipboardList, MessageCircle, Pill, QrCode, Share2 } from 'lucide-react'
import { useApp } from '../../state/store'
import { useT } from '../../i18n'
import { Avatar, Button, cx } from '../../components/ui'
import { AllergyStrip, SourceLabel, StatusChip } from '../../components/status'
import { CountUp, DocThumb, EmptyArt } from '../../components/art'
import { Sparkline } from '../../components/Sparkline'
import { age, fmtDate, fmtHHMM } from '../../lib/format'
import { gsap, useGSAP, MOTION_OK } from '../../lib/motion'
import { outOfRange, STATUS_WORD, type AreaData } from './bodyAreas'
import type { TestResult } from '../../mock/types'

const AREA_CHIP = { danger: 'missed', warning: 'due', success: 'taken' } as const

/** Right panel: the selected body area. Cross-fades when the area changes (200 ms). */
export const AreaPanel = forwardRef<HTMLElement, { area: AreaData | null; empty: boolean }>(function AreaPanel({ area, empty }, ref) {
  const t = useT()
  const { s } = useApp()
  const body = useRef<HTMLDivElement>(null)
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        gsap.from(body.current!.children, { opacity: 0, y: 10, duration: 0.25, stagger: 0.04, clearProps: 'all' })
      })
      return () => mm.revert()
    },
    { dependencies: [area?.def.id], scope: body },
  )
  if (!area)
    return (
      <section ref={ref} className="rounded-card border border-border-subtle bg-surface p-6 text-center">
        <div className="flex justify-center">
          <EmptyArt kind="docs" />
        </div>
        <p className="mt-3 text-body text-ink-700">{empty ? t('No records yet. Upload your first report.') : t('Choose a point on the body to see its records.')}</p>
        {empty && (
          <Button variant="secondary" className="mt-4" to="/upload">
            {t('Upload a report')}
          </Button>
        )}
      </section>
    )
  const I = area.def.icon
  const lead: TestResult | undefined = [...area.tests].sort((a, b) => Number(outOfRange(b)) - Number(outOfRange(a)))[0]
  const docs = Array.from(new Set([...area.items.map((i) => i.documentId), ...area.meds.map((m) => m.documentId), ...area.tests.flatMap((x) => x.points.map((p) => p.documentId))].filter(Boolean))) as string[]
  const sectionLink = area.items[0] ? `/record/${area.items[0].section}` : lead ? `/record/tests/${lead.id}` : '/medicines'
  return (
    <section ref={ref} aria-labelledby="area-title" className="rounded-card border border-border-subtle bg-surface">
      <div ref={body}>
        <header className="flex items-start gap-3 border-b border-border-subtle p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-600">
            <I className="size-5" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="area-title" className="text-h3 font-semibold">
              {t(area.def.label)}
            </h2>
            <p className="text-caption text-ink-700">{t('Updated {date}', { date: fmtDate(area.updated) })}</p>
            <div className="mt-2">
              <StatusChip status={AREA_CHIP[area.status]} label={t(STATUS_WORD[area.status])} />
            </div>
          </div>
        </header>

        {lead && (
          <Link to={`/record/tests/${lead.id}`} className="group block border-b border-border-subtle p-4 hover:bg-primary-50/50">
            <p className="flex items-center justify-between text-small text-ink-700">
              {t(lead.name)}
              <ArrowUpRight className="size-4 text-ink-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
            </p>
            <p className={cx('text-display font-bold tabular', outOfRange(lead) && 'text-danger-text')}>
              <CountUp value={lead.points[lead.points.length - 1].value} decimals={lead.points[lead.points.length - 1].value % 1 ? 1 : 0} /> <span className="text-body font-semibold">{lead.unit}</span>
            </p>
            <p className="text-caption text-ink-700 tabular">
              {t('Normal range')}: {lead.low}–{lead.high} {lead.unit}
            </p>
            <div className="mt-2">
              <Sparkline points={lead.points} low={lead.low} high={lead.high} unit={lead.unit} height={84} showLabels />
            </div>
          </Link>
        )}

        {area.items.length > 0 && (
          <ul className="divide-y divide-border-subtle border-b border-border-subtle">
            {area.items.slice(0, 4).map((i) => (
              <li key={i.id} className="px-4 py-3">
                <p className="font-semibold">{i.title}</p>
                {i.detail && <p className="text-small text-ink-700">{i.detail}</p>}
                <SourceLabel source={i.source} className="mt-1" />
              </li>
            ))}
          </ul>
        )}

        {area.meds.length > 0 && (
          <div className="border-b border-border-subtle p-4">
            <p className="mb-2 text-small font-semibold text-ink-700">{t('Medicines')}</p>
            <ul className="flex flex-col gap-2">
              {area.meds.map((m) => (
                <li key={m.id}>
                  <Link to={`/medicines/${m.id}`} className="card-link flex min-h-12 items-center gap-3 rounded-control border border-border-subtle bg-surface px-3 py-2">
                    <Pill className="size-5 shrink-0 text-primary-600" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">
                        {m.name} <span className="tabular">{m.dose}</span>
                      </span>
                      <span className="block text-caption text-ink-700 tabular">{m.times.map(fmtHHMM).join(', ')}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {docs.length > 0 && (
          <div className="border-b border-border-subtle p-4">
            <p className="mb-2 text-small font-semibold text-ink-700">{t('Documents')}</p>
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {docs.slice(0, 4).map((id) => {
                const d = s.documents.find((x) => x.id === id)
                if (!d) return null
                return (
                  <Link key={id} to={`/documents/${id}`} aria-label={d.title} className="card-link shrink-0 rounded-control border border-border-subtle bg-neutral-bg p-1">
                    <DocThumb seed={d.seed} className="h-20 w-15" rotate={false} />
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex gap-2 p-4">
          <Button variant="secondary" icon={ClipboardList} className="flex-1" to={sectionLink}>
            {t('Open in record')}
          </Button>
          <Button variant="tertiary" icon={MessageCircle} aria-label={t('Ask AI about this')} to="/ai" className="px-3">
            <span className="hidden sm:inline">{t('Ask AI')}</span>
          </Button>
        </div>
      </div>
    </section>
  )
})

/** Left column: who this is, allergies (never animated), and the QR one tap away */
export function ProfileCard() {
  const { profile } = useApp()
  const t = useT()
  const facts: [string, string][] = [
    [t('Date of birth'), fmtDate(profile.dob)],
    [t('Sex'), t(profile.sex === 'female' ? 'Female' : profile.sex === 'male' ? 'Male' : 'Other')],
    [t('Blood group'), profile.bloodGroup ?? t('Not sure')],
    [t('Age'), `${age(profile.dob)}`],
  ]
  return (
    <section aria-label={t('Profile')} className="rounded-card border border-border-subtle bg-surface p-4">
      <div className="flex items-center gap-3">
        <Avatar name={profile.name} size={56} />
        <div className="min-w-0">
          <p className="truncate text-h3 font-semibold">{profile.name}</p>
          <p className="text-small text-ink-700">{profile.relation === 'self' ? t('You') : t(profile.relation[0].toUpperCase() + profile.relation.slice(1))}</p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt className="text-caption text-ink-700">{k}</dt>
            <dd className="font-semibold tabular">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4">
        <AllergyStrip profileId={profile.id} />
      </div>
      <div className="mt-4 rounded-card border border-border-subtle p-3">
        <div className="flex items-center gap-3">
          <Link to="/share/qr" aria-label={t('My QR code')} className="card-link shrink-0 rounded-control bg-surface p-1">
            <QRCodeSVG value={`medguard://p/${profile.id}`} size={64} level="M" />
          </Link>
          <p className="min-w-0 flex-1 text-small text-ink-700">{t('Hospitals and doctors scan this to open the record.')}</p>
        </div>
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" icon={QrCode} to="/share/qr" className="flex-1 px-3">
            {t('My QR')}
          </Button>
          <Button variant="secondary" icon={Share2} aria-label={t('Share with a doctor')} to="/share/doctor" className="w-12 px-0" />
        </div>
      </div>
    </section>
  )
}

/** Vitals and test trend cards with a self-drawing sparkline and a count-up value */
export function VitalCard({ test }: { test: TestResult }) {
  const t = useT()
  const last = test.points[test.points.length - 1]
  const prev = test.points[test.points.length - 2]
  const out = outOfRange(test)
  const diff = prev ? +(last.value - prev.value).toFixed(1) : 0
  return (
    <Link to={`/record/tests/${test.id}`} className="card-link block min-w-[240px] rounded-card border border-border-subtle bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="line-clamp-2 text-small text-ink-700">{t(test.name)}</p>
          <p className={cx('text-h1 font-bold tabular', out && 'text-danger-text')}>
            <CountUp value={last.value} decimals={last.value % 1 ? 1 : 0} /> <span className="text-small font-semibold">{test.unit}</span>
          </p>
        </div>
        {out ? <StatusChip status="missed" label={t('Out of range')} /> : <StatusChip status="taken" label={t('In range')} />}
      </div>
      <div className="mt-2">
        <Sparkline points={test.points} low={test.low} high={test.high} unit={test.unit} height={56} />
      </div>
      <p className="mt-1 flex items-center justify-between text-caption text-ink-700 tabular">
        <span>{fmtDate(last.date)}</span>
        {prev && (
          <span>
            {diff > 0 ? '▲' : diff < 0 ? '▼' : '•'} {Math.abs(diff)} {t('since last')}
          </span>
        )}
      </p>
    </Link>
  )
}

