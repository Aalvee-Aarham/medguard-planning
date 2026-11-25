import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BadgeCheck, Camera, FileText, QrCode, ScanLine, Search, ShieldX, UserRound } from 'lucide-react'
import { useApp, uid } from '../../state/store'
import { useT } from '../../i18n'
import { ActionBar, Avatar, Button, Card, Input, List, ListRow, Note, PageHeader, Screen, SectionTitle, Stack, Tabs, Textarea } from '../../components/ui'
import { StatusChip } from '../../components/status'
import { EmptyState, Loadable } from '../../components/states'
import { CheckDraw } from '../../components/CheckDraw'
import { DocThumb } from '../../components/art'
import { fakeDelay, useFakeLoad } from '../../mock/api'
import { countdown, fmtDateTime } from '../../lib/format'
import { RecordOverview } from '../record/Record'
import { MOTHER } from '../../mock/seed'

/** J1 BMDC verification. Mock: numbers starting "A-" pass. Fail -> stays a normal account, Retry. */
export function BmdcVerify() {
  const { mutate } = useApp()
  const t = useT()
  const nav = useNavigate()
  const [f, setF] = useState({ name: 'Dr. Karim Hossain', bmdc: 'A-12345' })
  const [res, setRes] = useState<'idle' | 'checking' | 'pass' | 'fail'>('idle')
  if (res === 'pass')
    return (
      <Screen className="flex min-h-[80dvh] flex-col items-center justify-center gap-4 text-center">
        <CheckDraw size={88} />
        <h1 className="text-h1 font-semibold">{t('You are verified')}</h1>
        <p className="text-body text-ink-700">{t('BMDC {n} matches {name}.', { n: f.bmdc, name: f.name })}</p>
        <Button full onClick={() => nav('/start/biometric')}>
          {t('Continue')}
        </Button>
      </Screen>
    )
  return (
    <Screen>
      <PageHeader title={t('Verify you are a doctor')} sub={t('We check your BMDC registration automatically.')} />
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setRes('checking')
          await fakeDelay(null)
          if (/^A-\d+/i.test(f.bmdc.trim())) {
            mutate((d) => {
              d.account.type = 'doctor'
              d.account.doctor = { name: f.name.trim(), bmdc: f.bmdc.trim().toUpperCase(), specialty: 'Neurology', chamber: 'Green Road, Dhanmondi', verified: true }
            })
            setRes('pass')
          } else setRes('fail')
        }}
      >
        <Input label={t('Full name as registered')} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input label={t('BMDC number')} value={f.bmdc} onChange={(e) => setF({ ...f, bmdc: e.target.value })} hint={t('Example: A-12345')} />
        {res === 'fail' && (
          <Note tone="danger" icon={ShieldX}>
            <span className="font-semibold">{t('We could not match this BMDC number.')}</span>
            <span className="block text-small">{t('Your account stays a normal user account. Check the number and try again.')}</span>
          </Note>
        )}
        <Button full type="submit" loading={res === 'checking'}>
          {res === 'fail' ? t('Check again') : t('Check registration')}
        </Button>
        {res === 'fail' && (
          <Button full variant="tertiary" to="/start/profile">
            {t('Continue as a normal user')}
          </Button>
        )}
      </form>
    </Screen>
  )
}

/** J2 Doctor home */
export function DoctorHome() {
  const { s } = useApp()
  const t = useT()
  const { state, retry } = useFakeLoad('dochome')
  const [q, setQ] = useState('')
  const list = s.sharedPatients.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <Screen>
      <PageHeader title={t('Doctor home')} back={false} sub={s.account.doctor ? `${t('BMDC')} ${s.account.doctor.bmdc}` : undefined} />
      <Button full big icon={QrCode} to="/doctor/scan">
        {t('Scan patient QR')}
      </Button>
      <SectionTitle>{t('Shared with you')}</SectionTitle>
      <Input label={t('Search patients')} type="search" value={q} onChange={(e) => setQ(e.target.value)} />
      <Loadable state={state} retry={retry}>
        {list.length ? (
          <List className="mt-3">
            {list.map((p) => (
              <ListRow
                key={p.id}
                icon={UserRound}
                title={p.name}
                sub={<span className="tabular">{p.age} · {t(p.sex === 'female' ? 'Female' : 'Male')} · {t('until {time}', { time: fmtDateTime(p.until) })}</span>}
                to={`/doctor/patients/${p.id}`}
              />
            ))}
          </List>
        ) : (
          <div className="mt-3">
            <EmptyState art="search" text={t('No patients have shared with you yet.')} />
          </div>
        )}
      </Loadable>
    </Screen>
  )
}

/** J3 Scan QR: viewfinder mock with "Simulate scan"; after scan "Access for 24 hours" */
export function ScanQr() {
  const { mutate } = useApp()
  const t = useT()
  const nav = useNavigate()
  const [done, setDone] = useState<string | null>(null)
  if (done)
    return (
      <Screen className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 text-center">
        <CheckDraw size={80} />
        <h1 className="text-h1 font-semibold">{t('Rahima Begum’s record is open')}</h1>
        <StatusChip status="next" label={t('Access for 24 hours')} />
        <p className="text-body text-ink-700">{t('The patient and their caregivers are told you opened it.')}</p>
        <Button full onClick={() => nav(`/doctor/patients/${done}`)}>
          {t('Open record')}
        </Button>
      </Screen>
    )
  return (
    <div className="flex min-h-[calc(100dvh-128px)] flex-col bg-ink-900 p-4 text-white">
      <h1 className="text-h2 font-semibold">{t('Scan the patient’s QR')}</h1>
      <div className="relative mt-4 grid flex-1 place-items-center overflow-hidden rounded-card bg-neutral-text" style={{ minHeight: 320 }}>
        <div className="relative size-60 rounded-card border-4 border-white/90" aria-hidden>
          <ScanLine className="absolute inset-0 m-auto size-24 text-white/60" />
        </div>
        <p className="absolute bottom-4 text-small font-semibold">{t('Point the camera at the code')}</p>
      </div>
      <Stack className="mt-4" gap={2}>
        <Button
          full
          icon={Camera}
          onClick={() => {
            const id = uid('sp')
            mutate((d) => {
              d.sharedPatients.unshift({ id, profileId: MOTHER, name: 'Rahima Begum', age: 62, sex: 'female', until: new Date(Date.now() + 86400000).toISOString(), via: 'qr' })
              d.accessLog.unshift({ id: uid('l'), profileId: MOTHER, who: d.account.doctor?.name ?? 'Dr. Karim Hossain', action: 'viewed', at: new Date().toISOString(), reason: 'QR scan' })
            })
            setDone(id)
          }}
        >
          {t('Simulate scan')}
        </Button>
        <Button full variant="tertiary" className="text-white hover:bg-white/10" to="/doctor">
          {t('Cancel')}
        </Button>
      </Stack>
    </div>
  )
}

/** J4 Patient profile, doctor view: same components as H26 + similar cases + Add prescription */
export function DoctorPatient() {
  const { id } = useParams()
  const { s } = useApp()
  const t = useT()
  const sp = s.sharedPatients.find((p) => p.id === id)
  if (!sp) return <Screen><PageHeader title={t('Not found')} /></Screen>
  const left = new Date(sp.until).getTime() - Date.now()
  return (
    <div>
      <Screen className="pb-0">
        <PageHeader title={sp.name} sub={<StatusChip status={left > 0 ? 'next' : 'expired'} label={left > 0 ? t('Access ends in {time}', { time: countdown(left) }) : t('Access ended')} />} />
      </Screen>
      <RecordOverview profileId={sp.profileId} doctorView />
      <Screen className="pt-0">
        <SectionTitle>{t('Similar cases')}</SectionTitle>
        <List>
          {s.cases.slice(0, 3).map((c) => (
            <ListRow key={c.id} icon={Search} title={c.condition} sub={c.matches.join(', ')} to={`/similar/cases/${c.id}`} />
          ))}
        </List>
        <ActionBar>
          <Button full icon={FileText} to={`/doctor/patients/${sp.id}/add`}>
            {t('Add prescription or note')}
          </Button>
        </ActionBar>
      </Screen>
    </div>
  )
}

/** J5 Add prescription or note. Patient sees "Added by Dr. X". */
export function AddPrescription() {
  const { id } = useParams()
  const { s, mutate, toast } = useApp()
  const t = useT()
  const nav = useNavigate()
  const [mode, setMode] = useState<'typed' | 'photo'>('typed')
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState(false)
  const sp = s.sharedPatients.find((p) => p.id === id)
  if (!sp) return <Screen><PageHeader title={t('Not found')} /></Screen>
  const doctorName = s.account.doctor?.name ?? 'Dr. Karim Hossain'
  return (
    <Screen>
      <PageHeader title={t('Add prescription or note')} sub={t('For {name}', { name: sp.name })} />
      <Tabs label={t('How')} value={mode} onChange={setMode} tabs={[{ value: 'typed', label: t('Type it') }, { value: 'photo', label: t('Photo') }]} />
      <div className="mt-4">
        {mode === 'typed' ? (
          <Textarea label={t('Prescription or note')} rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Clopidogrel 75 mg once daily for 21 days" />
        ) : photo ? (
          <Card className="flex justify-center">
            <DocThumb seed={41} className="h-48" />
          </Card>
        ) : (
          <Button full variant="secondary" icon={Camera} onClick={() => setPhoto(true)}>
            {t('Take photo')}
          </Button>
        )}
      </div>
      <Note tone="info" className="mt-4">
        {t('The patient will see “Added by {name}”.', { name: doctorName })}
      </Note>
      <ActionBar>
        <Button
          full
          disabled={mode === 'typed' ? !text.trim() : !photo}
          onClick={() => {
            const now = new Date().toISOString()
            mutate((d) => {
              d.items.push({ id: uid('r'), profileId: sp.profileId, section: 'prescriptions', title: mode === 'typed' ? text.trim().split('\n')[0] : t('Prescription photo'), detail: mode === 'typed' ? text.trim() : undefined, date: now, source: { kind: 'doctor', by: doctorName, at: now }, confirmed: true })
              d.accessLog.unshift({ id: uid('l'), profileId: sp.profileId, who: doctorName, action: 'added', at: now })
              d.notifications.unshift({ id: uid('n'), kind: 'access', title: t('{doc} added a prescription', { doc: doctorName }), body: t('To {name}’s record.', { name: sp.name }), at: now, read: false, link: '/record/prescriptions', tier: 'normal' })
            })
            toast(t('Added to {name}’s record', { name: sp.name }))
            nav(`/doctor/patients/${sp.id}`)
          }}
        >
          {t('Add to record')}
        </Button>
      </ActionBar>
    </Screen>
  )
}

/** J6 My doctor profile */
export function DoctorProfile() {
  const { s, mutate, toast } = useApp()
  const t = useT()
  const d = s.account.doctor ?? { name: 'Dr. Karim Hossain', bmdc: 'A-12345', specialty: 'Neurology', chamber: 'Green Road, Dhanmondi', verified: true }
  const [f, setF] = useState({ specialty: d.specialty, chamber: d.chamber })
  return (
    <Screen>
      <PageHeader title={t('My doctor profile')} />
      <Card className="flex items-center gap-4">
        <Avatar name={s.account.name} size={56} />
        <div>
          <p className="text-h3 font-semibold">{d.name}</p>
          <p className="flex items-center gap-1 text-small text-success-text">
            <BadgeCheck className="size-4" aria-hidden /> {t('BMDC {n}, verified', { n: d.bmdc })}
          </p>
        </div>
      </Card>
      <form
        className="mt-6 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          mutate((x) => void (x.account.doctor = { ...d, ...f }))
          toast(t('Profile saved'))
        }}
      >
        <Input label={t('Specialty')} value={f.specialty} onChange={(e) => setF({ ...f, specialty: e.target.value })} />
        <Input label={t('Chamber address')} value={f.chamber} onChange={(e) => setF({ ...f, chamber: e.target.value })} />
        <Button full type="submit">
          {t('Save profile')}
        </Button>
      </form>
    </Screen>
  )
}
