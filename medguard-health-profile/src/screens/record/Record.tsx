import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Activity, AlertTriangle, Building2, CalendarClock, ClipboardList, FileImage, FileText, FlaskConical, HeartPulse, History, Pill, RefreshCw, Scissors, Share2, Sparkles, Stethoscope, Syringe, Trash2, Users, type LucideIcon,
} from 'lucide-react'
import { useApp, uid } from '../../state/store'
import { useT } from '../../i18n'
import { ActionBar, Avatar, Button, Card, cx, Input, List, ListRow, Note, PageHeader, Screen, SectionTitle, Select, Stack, Tabs, Textarea } from '../../components/ui'
import { AllergyStrip, ItemTags, NeedsInternet, SourceLabel, StatusChip } from '../../components/status'
import { ConfirmDialog } from '../../components/overlays'
import { EmptyState, Loadable, NoAccess, Skeleton } from '../../components/states'
import { DocThumb } from '../../components/art'
import { TrendChart } from '../../components/TrendChart'
import { useFakeLoad } from '../../mock/api'
import { age, fmtDate } from '../../lib/format'
import type { RecordSection } from '../../mock/types'

export const SECTIONS: { key: RecordSection; label: string; icon: LucideIcon }[] = [
  { key: 'conditions', label: 'Conditions', icon: HeartPulse },
  { key: 'medicines', label: 'Current medicines', icon: Pill },
  { key: 'tests', label: 'Test results', icon: FlaskConical },
  { key: 'imaging', label: 'Imaging', icon: FileImage },
  { key: 'prescriptions', label: 'Prescriptions', icon: FileText },
  { key: 'vitals', label: 'Vitals', icon: Activity },
  { key: 'surgeries', label: 'Surgeries and admissions', icon: Scissors },
  { key: 'vaccinations', label: 'Vaccinations', icon: Syringe },
  { key: 'lifestyle', label: 'Family and lifestyle', icon: Users },
  { key: 'doctors', label: 'Doctors seen', icon: Stethoscope },
]

/** Header: photo, name, age, sex, blood group + allergy strip. Used by H26 and J4. */
export function RecordHeader({ profileId }: { profileId: string }) {
  const { s } = useApp()
  const t = useT()
  const p = s.profiles.find((x) => x.id === profileId)!
  return (
    <>
      <Card className="flex items-center gap-4">
        <Avatar name={p.name} size={64} />
        <div className="min-w-0">
          <p className="text-h3 font-semibold">{p.name}</p>
          <p className="text-body text-ink-700 tabular">
            {age(p.dob)} {t('years')} · {t(p.sex === 'female' ? 'Female' : p.sex === 'male' ? 'Male' : 'Other')}
            {p.bloodGroup && <> · {t('Blood')} <span className="font-semibold text-ink-900">{p.bloodGroup}</span></>}
          </p>
        </div>
      </Card>
      <div className="mt-3">
        <AllergyStrip profileId={profileId} />
      </div>
    </>
  )
}

/** Section counts for a profile; sections show only when they have data */
function useSectionData(profileId: string) {
  const { s } = useApp()
  return useMemo(() => {
    const out: Record<string, number> = {}
    for (const i of s.items.filter((x) => x.profileId === profileId)) out[i.section] = (out[i.section] ?? 0) + 1
    out.medicines = s.medicines.filter((m) => m.profileId === profileId && m.current).length
    out.tests = s.tests.filter((x) => x.profileId === profileId).length
    out.surgeries = (out.surgeries ?? 0) + s.admissions.filter((a) => a.profileId === profileId).length
    return out
  }, [s, profileId])
}

/** H26 Record overview */
export function RecordOverview({ profileId: forced, doctorView }: { profileId?: string; doctorView?: boolean }) {
  const { profile, can } = useApp()
  const t = useT()
  const pid = forced ?? profile.id
  const { state, retry } = useFakeLoad('rec' + pid)
  const counts = useSectionData(pid)
  const shown = SECTIONS.filter((x) => counts[x.key])
  const missing = SECTIONS.filter((x) => ['conditions', 'vaccinations', 'medicines'].includes(x.key) && !counts[x.key])
  return (
    <Screen>
      {!doctorView && <PageHeader title={t('My Record')} back={false} action={<Button variant="tertiary" icon={CalendarClock} to="/timeline" className="px-3">{t('Timeline')}</Button>} />}
      <RecordHeader profileId={pid} />
      <Loadable
        state={state}
        retry={retry}
        skeleton={
          <div className="mt-4 flex flex-col gap-3" role="status" aria-label={t('Loading')}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        }
      >
        {shown.length === 0 ? (
          <div className="mt-6">
            <EmptyState text={t('No records yet. Upload your first report.')} action={can('upload') && <Button to="/upload">{t('Upload a report')}</Button>} />
          </div>
        ) : (
          <List className="mt-4">
            {shown.map((sec) => (
              <ListRow key={sec.key} icon={sec.icon} title={t(sec.label)} sub={t('{n} items', { n: counts[sec.key] })} to={doctorView ? undefined : sec.key === 'medicines' ? '/medicines' : `/record/${sec.key}`} />
            ))}
          </List>
        )}
        {!doctorView && can('edit') && missing.length > 0 && (
          <>
            <SectionTitle>{t('Add this?')}</SectionTitle>
            <Stack gap={2}>
              {missing.map((m) => (
                <div key={m.key} className="flex items-center gap-3 rounded-card border border-dashed border-border-input bg-surface p-3">
                  <Sparkles className="size-5 text-primary-600" aria-hidden />
                  <span className="flex-1">{t('Doctors often ask about {what}.', { what: t(m.label).toLowerCase() })}</span>
                  <Button variant="tertiary" className="px-3" to={`/record/add?type=${m.key}`}>
                    {t('Add')}
                  </Button>
                </div>
              ))}
            </Stack>
          </>
        )}
      </Loadable>
    </Screen>
  )
}

/** H27 Section list: filter by date + type, each with SourceLabel */
export function SectionList() {
  const { section } = useParams()
  const { s, profile } = useApp()
  const t = useT()
  const meta = SECTIONS.find((x) => x.key === section)
  const [range, setRange] = useState<'all' | 'year' | 'month'>('all')
  const [kind, setKind] = useState('all')
  const { state, retry } = useFakeLoad('sec' + section)
  const cutoff = range === 'all' ? 0 : Date.now() - (range === 'year' ? 365 : 30) * 86400000
  if (section === 'tests') {
    const tests = s.tests.filter((x) => x.profileId === profile.id)
    return (
      <Screen>
        <PageHeader title={t('Test results')} />
        <Loadable state={state} retry={retry}>
          <List>
            {tests.map((x) => {
              const last = x.points[x.points.length - 1]
              const out = last.value < x.low || last.value > x.high
              return (
                <ListRow
                  key={x.id}
                  icon={FlaskConical}
                  iconTone={out ? 'danger' : 'primary'}
                  title={x.name}
                  sub={
                    <>
                      <span className="font-semibold text-ink-900 tabular">
                        {last.value} {x.unit}
                      </span>{' '}
                      · {fmtDate(last.date)}
                    </>
                  }
                  to={`/record/tests/${x.id}`}
                  right={out ? <StatusChip status="missed" label={t('Out of range')} /> : <StatusChip status="taken" label={t('In range')} />}
                />
              )
            })}
          </List>
        </Loadable>
      </Screen>
    )
  }
  const items = s.items
    .filter((i) => i.profileId === profile.id && i.section === section && new Date(i.date).getTime() >= cutoff && (kind === 'all' || i.source.kind === kind))
    .sort((a, b) => b.date.localeCompare(a.date))
  const admissions = section === 'surgeries' ? s.admissions.filter((a) => a.profileId === profile.id) : []
  return (
    <Screen>
      <PageHeader title={t(meta?.label ?? 'Records')} />
      <div className="flex gap-2">
        <Select label={t('Date')} value={range} onChange={(e) => setRange(e.target.value as 'all')} className="flex-1">
          <option value="all">{t('Any time')}</option>
          <option value="year">{t('Last 12 months')}</option>
          <option value="month">{t('Last 30 days')}</option>
        </Select>
        <Select label={t('Added by')} value={kind} onChange={(e) => setKind(e.target.value)} className="flex-1">
          <option value="all">{t('Anyone')}</option>
          <option value="self">{t('You')}</option>
          <option value="doctor">{t('Doctor')}</option>
          <option value="hospital">{t('Hospital')}</option>
          <option value="ai">{t('AI, confirmed')}</option>
        </Select>
      </div>
      <Loadable state={state} retry={retry}>
        <Stack className="mt-4">
          {admissions.map((a) => (
            <Card key={a.id} to={`/admissions/${a.id}`}>
              <div className="flex items-start gap-3">
                <Building2 className="mt-1 size-5 text-primary-600" aria-hidden />
                <div>
                  <p className="font-semibold">{a.hospital}</p>
                  <p className="text-small text-ink-700">
                    {a.ward} · {fmtDate(a.from)} – {a.to ? fmtDate(a.to) : t('now')}
                  </p>
                  <SourceLabel source={a.source} className="mt-1" />
                </div>
              </div>
            </Card>
          ))}
          {items.map((i) => (
            <Card key={i.id} to={i.documentId ? `/documents/${i.documentId}` : `/record/items/${i.id}/edit`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-body font-semibold">{i.title}</p>
                <ItemTags item={i} />
              </div>
              {i.detail && <p className="text-small text-ink-700">{i.detail}</p>}
              <SourceLabel source={i.source} className="mt-2" />
            </Card>
          ))}
          {!items.length && !admissions.length && <EmptyState text={t('Nothing matches these filters.')} art="search" />}
        </Stack>
      </Loadable>
    </Screen>
  )
}

/** H28 Test result detail */
export function TestDetail() {
  const { id } = useParams()
  const { s } = useApp()
  const t = useT()
  const x = s.tests.find((y) => y.id === id)
  if (!x) return <Screen><PageHeader title={t('Not found')} /></Screen>
  const last = x.points[x.points.length - 1]
  const out = last.value < x.low || last.value > x.high
  return (
    <Screen>
      <PageHeader title={x.name} />
      <Card>
        <p className="text-small text-ink-700">{t('Latest')} · {fmtDate(last.date)}</p>
        <div className="mt-1 flex items-center gap-3">
          <p className={cx('text-display font-bold tabular', out && 'text-danger-text')}>
            {last.value} <span className="text-h3 font-semibold">{x.unit}</span>
          </p>
          {out ? <StatusChip status="missed" label={t('Out of range')} /> : <StatusChip status="taken" label={t('In range')} />}
        </div>
        <p className="mt-1 text-body text-ink-700 tabular">
          {t('Normal range')}: {x.low}–{x.high} {x.unit}
        </p>
      </Card>
      <SectionTitle>{t('Over time')}</SectionTitle>
      <Card>
        <TrendChart points={x.points} low={x.low} high={x.high} unit={x.unit} />
        <p className="mt-2 flex items-center gap-2 text-small text-ink-700">
          <span className="inline-block h-3 w-6 rounded-sm bg-primary-50 ring-1 ring-primary-100" aria-hidden /> {t('Normal range')}
          <span className="ml-3 inline-block size-3 rounded-full bg-danger-text" aria-hidden /> {t('Out of range')}
        </p>
      </Card>
      <SectionTitle>{t('All readings')}</SectionTitle>
      <List>
        {[...x.points].reverse().map((p) => (
          <ListRow key={p.date} title={<span className="tabular">{p.value} {x.unit}</span>} sub={fmtDate(p.date)} to={p.documentId ? `/documents/${p.documentId}` : undefined} />
        ))}
      </List>
      <SourceLabel source={x.source} className="mt-3" />
    </Screen>
  )
}

/** H29 Document viewer */
export function DocumentViewer() {
  const { id } = useParams()
  const { s, mutate, can, online, toast } = useApp()
  const t = useT()
  const nav = useNavigate()
  const [del, setDel] = useState(false)
  const [busy, setBusy] = useState(false)
  const d = s.documents.find((x) => x.id === id)
  if (!d) return <Screen><PageHeader title={t('Document not found')} /><EmptyState text={t('It may have been deleted.')} /></Screen>
  return (
    <Screen>
      <PageHeader title={d.title} sub={fmtDate(d.date)} />
      <div className="rounded-card border border-border-subtle bg-neutral-bg p-4">
        <DocThumb seed={d.seed} className="mx-auto h-72" rotate={false} />
        <p className="mt-2 text-center text-small text-ink-700">{t('{n} pages', { n: d.pages })}</p>
      </div>
      <SourceLabel source={d.source} className="mt-3" />
      <SectionTitle>{t('What was read')}</SectionTitle>
      <List>
        {d.extracted.map((e, i) => (
          <ListRow key={i} title={e.value} sub={t(e.label)} right={<StatusChip status="confirmed" />} />
        ))}
      </List>
      <div className="mt-6 flex flex-col gap-2">
        {can('share') && (
          <Button full variant="secondary" icon={Share2} to="/share/doctor">
            {t('Share with a doctor')}
          </Button>
        )}
        <Button
          full
          variant="secondary"
          icon={RefreshCw}
          loading={busy}
          disabled={!online}
          onClick={() => {
            setBusy(true)
            setTimeout(() => {
              setBusy(false)
              toast(t('Read again. Nothing changed.'))
            }, 900)
          }}
        >
          {t('Re-read with AI')}
        </Button>
        {!online && <NeedsInternet />}
        {can('delete') && (
          <Button full variant="tertiary" icon={Trash2} className="text-danger-text" onClick={() => setDel(true)}>
            {t('Delete document')}
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={del}
        onClose={() => setDel(false)}
        title={t('Delete this document?')}
        body={t('Items read from it stay in the record, but the original will be gone.')}
        confirmLabel={t('Delete')}
        destructive
        onConfirm={() => {
          mutate((x) => {
            x.documents = x.documents.filter((y) => y.id !== d.id)
            x.accessLog.unshift({ id: uid('l'), profileId: d.profileId, who: t('You'), action: 'edited', at: new Date().toISOString(), reason: 'Deleted document' })
          })
          toast(t('Document deleted'))
          nav(-1)
        }}
      />
    </Screen>
  )
}

/** H30 Edit item + change history */
export function EditItem() {
  const { id } = useParams()
  const { s, mutate, toast, can, queueIfOffline } = useApp()
  const t = useT()
  const nav = useNavigate()
  const item = s.items.find((x) => x.id === id)
  const [title, setTitle] = useState(item?.title ?? '')
  const [detail, setDetail] = useState(item?.detail ?? '')
  if (!item) return <Screen><PageHeader title={t('Not found')} /></Screen>
  if (!can('edit'))
    return (
      <Screen>
        <PageHeader title={item.title} />
        <NoAccess owner={s.account.name} />
      </Screen>
    )
  return (
    <Screen>
      <PageHeader title={t('Edit item')} />
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          const now = new Date().toISOString()
          mutate((d) => {
            const x = d.items.find((y) => y.id === item.id)!
            x.history = x.history ?? []
            if (x.title !== title) x.history.unshift({ by: 'you', at: now, field: 'Name', from: x.title, to: title })
            if ((x.detail ?? '') !== detail) x.history.unshift({ by: 'you', at: now, field: 'Details', from: x.detail ?? '—', to: detail })
            x.title = title
            x.detail = detail
          })
          toast(queueIfOffline('Edit item') ? t('Saved on this phone. Will sync when online.') : t('Changes saved'))
          nav(-1)
        }}
      >
        <Input label={t('Name')} value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea label={t('Details')} value={detail} onChange={(e) => setDetail(e.target.value)} />
        <SourceLabel source={item.source} />
        <Button full type="submit">
          {t('Save changes')}
        </Button>
      </form>
      <SectionTitle>{t('Change history')}</SectionTitle>
      {item.history?.length ? (
        <List>
          {item.history.map((h, i) => (
            <ListRow key={i} icon={History} iconTone="neutral" title={`${t(h.field)}: ${h.from} → ${h.to}`} sub={`${h.by === 'you' ? t('You') : h.by}, ${fmtDate(h.at)}`} />
          ))}
        </List>
      ) : (
        <p className="text-body text-ink-700">{t('No changes yet.')}</p>
      )}
    </Screen>
  )
}

/** H31 Timeline: every event in date order, icon per type */
export function Timeline() {
  const { s, profile } = useApp()
  const t = useT()
  const { state, retry } = useFakeLoad('tl')
  const ev = [
    ...s.items.filter((i) => i.profileId === profile.id).map((i) => ({ id: i.id, at: i.date, icon: SECTIONS.find((x) => x.key === i.section)?.icon ?? (i.section === 'allergies' ? AlertTriangle : ClipboardList), title: i.title, src: i.source, to: `/record/${i.section}` })),
    ...s.documents.filter((d) => d.profileId === profile.id).map((d) => ({ id: d.id, at: d.date, icon: FileText, title: d.title, src: d.source, to: `/documents/${d.id}` })),
    ...s.admissions.filter((a) => a.profileId === profile.id).map((a) => ({ id: a.id, at: a.from, icon: Building2, title: t('Admitted to {h}', { h: a.hospital }), src: a.source, to: `/admissions/${a.id}` })),
  ].sort((a, b) => b.at.localeCompare(a.at))
  let year = ''
  return (
    <Screen>
      <PageHeader title={t('Timeline')} />
      <Loadable state={state} retry={retry}>
        <ol className="relative ml-5 border-l-2 border-border-subtle">
          {ev.map((e) => {
            const y = String(new Date(e.at).getFullYear())
            const head = y !== year
            year = y
            return (
              <li key={e.id} className="pb-4">
                {head && <p className="-ml-5 mb-2 bg-page py-1 text-small font-semibold text-ink-700 tabular">{y}</p>}
                <Link to={e.to} className="group -ml-5 flex gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-page bg-primary-50 text-primary-600">
                    <e.icon className="size-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 rounded-card border border-border-subtle bg-surface p-3 group-hover:border-primary-100">
                    <span className="block font-semibold">{e.title}</span>
                    <span className="block text-caption text-ink-700">{fmtDate(e.at)}</span>
                    <SourceLabel source={e.src} />
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
      </Loadable>
    </Screen>
  )
}

/** H32 Admission detail + H33 delete dialog */
export function AdmissionDetail() {
  const { id } = useParams()
  const { s, mutate, toast, can } = useApp()
  const t = useT()
  const nav = useNavigate()
  const [del, setDel] = useState(false)
  const a = s.admissions.find((x) => x.id === id)
  if (!a) return <Screen><PageHeader title={t('Not found')} /></Screen>
  return (
    <Screen>
      <PageHeader title={a.hospital} sub={`${a.ward} · ${a.bed}`} />
      <Card>
        <p className="text-small text-ink-700">{t('Stay')}</p>
        <p className="font-semibold tabular">
          {fmtDate(a.from)} – {a.to ? fmtDate(a.to) : t('now')}
        </p>
        <SourceLabel source={a.source} className="mt-2" />
      </Card>
      <SectionTitle>{t('Discharge summary')}</SectionTitle>
      <Card>
        <p className="text-body">{a.summary}</p>
      </Card>
      <SectionTitle>{t('Medicines from this stay')}</SectionTitle>
      <List>
        {a.medicines.map((m) => (
          <ListRow key={m} icon={Pill} title={m} />
        ))}
      </List>
      {a.results.length > 0 && (
        <>
          <SectionTitle>{t('Results from this stay')}</SectionTitle>
          <List>
            {a.results.map((r) => (
              <ListRow key={r} icon={FlaskConical} title={r} />
            ))}
          </List>
        </>
      )}
      {can('delete') && (
        <Button full variant="tertiary" icon={Trash2} className="mt-6 text-danger-text" onClick={() => setDel(true)}>
          {t('Delete hospital record')}
        </Button>
      )}
      <ConfirmDialog
        open={del}
        onClose={() => setDel(false)}
        title={t('Delete this hospital record?')}
        body={
          <Note tone="warning" icon={AlertTriangle}>
            {t('Doctors may rely on this stay record. {h} keeps its own copy.', { h: a.hospital })}
          </Note>
        }
        reason={t('Reason')}
        confirmLabel={t('Delete record')}
        destructive
        onConfirm={(reason) => {
          mutate((d) => {
            d.admissions = d.admissions.filter((x) => x.id !== a.id)
            d.accessLog.unshift({ id: uid('l'), profileId: a.profileId, who: t('You'), action: 'edited', at: new Date().toISOString(), reason: reason || 'Deleted hospital record' })
          })
          toast(t('Hospital record deleted'))
          nav('/record', { replace: true })
        }}
      />
    </Screen>
  )
}

const TYPES = [
  { v: 'conditions', l: 'Condition' },
  { v: 'allergy', l: 'Allergy' },
  { v: 'medicines', l: 'Medicine' },
  { v: 'vitals', l: 'Vital reading' },
  { v: 'surgeries', l: 'Surgery' },
  { v: 'vaccination', l: 'Vaccination' },
]

/** H24 Manual entry: type picker -> one form. Source = "Entered by you". Works offline (queued). */
export function ManualEntry() {
  const { profile, mutate, toast, queueIfOffline, s } = useApp()
  const t = useT()
  const nav = useNavigate()
  const [q] = useSearchParams()
  const init = q.get('type') === 'vaccinations' ? 'vaccination' : (q.get('type') ?? 'conditions')
  const [type, setType] = useState(TYPES.some((x) => x.v === init) ? init : 'conditions')
  const [f, setF] = useState({ name: '', detail: '', date: new Date().toISOString().slice(0, 10), dose: '', time: '08:00', sys: '', dia: '' })
  const [err, setErr] = useState('')
  const allergyClash = type === 'medicines' && s.items.some((i) => i.profileId === profile.id && i.section === 'allergies' && f.name && /cillin/i.test(f.name) && /penicillin/i.test(i.title))
  return (
    <Screen>
      <PageHeader title={t('Type it in')} sub={t('For {name}', { name: profile.name })} />
      <Tabs label={t('Type')} value={type} onChange={(v) => (setType(v), setErr(''))} tabs={TYPES.slice(0, 3).map((x) => ({ value: x.v, label: t(x.l) }))} />
      <div className="mt-2">
        <Tabs label={t('More types')} value={type} onChange={(v) => (setType(v), setErr(''))} tabs={TYPES.slice(3).map((x) => ({ value: x.v, label: t(x.l) }))} />
      </div>
      <form
        className="mt-6 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          const name = type === 'vitals' ? `Blood pressure ${f.sys}/${f.dia} mmHg` : f.name.trim()
          if (type === 'vitals' ? !f.sys || !f.dia : !name) return setErr(t('Fill in this field.'))
          const now = new Date().toISOString()
          const src = { kind: 'self' as const, by: 'you', at: now }
          mutate((d) => {
            if (type === 'medicines')
              d.medicines.push({ id: uid('med'), profileId: profile.id, name, dose: f.dose, times: [f.time], food: 'any', prescribedBy: t('Entered by you'), start: f.date, current: true, source: src, reminder: { on: true, days: [0, 1, 2, 3, 4, 5, 6], sound: 'Chime', tellCaregivers: false } })
            else
              d.items.push({ id: uid('r'), profileId: profile.id, section: (type === 'allergy' ? 'allergies' : type === 'vaccination' ? 'vaccinations' : type) as RecordSection, title: name, detail: f.detail || undefined, date: f.date, source: src, confirmed: true })
          })
          toast(queueIfOffline('Add record') ? t('Saved on this phone. Will sync when online.') : t('Added to the record'))
          nav(type === 'medicines' ? '/medicines' : '/record')
        }}
      >
        {type === 'vitals' ? (
          <div className="flex gap-3">
            <Input label={t('Systolic')} inputMode="numeric" unit="mmHg" value={f.sys} onChange={(e) => setF({ ...f, sys: e.target.value })} error={err && !f.sys ? err : undefined} className="flex-1" />
            <Input label={t('Diastolic')} inputMode="numeric" unit="mmHg" value={f.dia} onChange={(e) => setF({ ...f, dia: e.target.value })} className="flex-1" />
          </div>
        ) : (
          <Input label={t({ conditions: 'Condition', allergy: 'What are you allergic to?', medicines: 'Medicine name', surgeries: 'Surgery', vaccination: 'Vaccine' }[type] ?? 'Name')} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={err && !f.name ? err : undefined} />
        )}
        {type === 'medicines' && (
          <div className="flex gap-3">
            <Input label={t('Dose')} value={f.dose} onChange={(e) => setF({ ...f, dose: e.target.value })} placeholder="500 mg" className="flex-1" />
            <Input label={t('Time')} type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} className="flex-1" />
          </div>
        )}
        {allergyClash && (
          <Note tone="danger" icon={AlertTriangle}>
            {t('{name} is allergic to Penicillin. Check with a doctor before taking this.', { name: profile.name })}
          </Note>
        )}
        {type !== 'medicines' && type !== 'vitals' && <Textarea label={t(type === 'allergy' ? 'What happens?' : 'Details (optional)')} value={f.detail} onChange={(e) => setF({ ...f, detail: e.target.value })} />}
        <Input label={t('Date')} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <ActionBar>
          <Button full type="submit">
            {t('Add to record')}
          </Button>
        </ActionBar>
      </form>
    </Screen>
  )
}
