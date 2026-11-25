import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { AlertTriangle, Building2, Copy, Eye, FilePlus, Flag, Link2, Pencil, RefreshCw, ShieldAlert, Stethoscope, Sun, UserRound, X } from 'lucide-react'
import { useApp, uid } from '../../state/store'
import { useT } from '../../i18n'
import { ActionBar, Button, Card, Checkbox, cx, List, ListRow, Note, PageHeader, Radio, Screen, SectionTitle } from '../../components/ui'
import { StatusChip } from '../../components/status'
import { ConfirmDialog } from '../../components/overlays'
import { EmptyState, Loadable, NoAccess } from '../../components/states'
import { useFakeLoad } from '../../mock/api'
import { countdown, fmtDate, fmtDateTime, fmtTime } from '../../lib/format'
import { SECTIONS } from '../record/Record'

const QR_TTL = 10 * 60 * 1000

/** H47 My QR: white full screen, QR >= 280 px, Screen Wake Lock, name + expiry countdown, Refresh */
export function MyQr() {
  const { profile } = useApp()
  const t = useT()
  const nav = useNavigate()
  const [issued, setIssued] = useState(Date.now())
  const [now, setNow] = useState(Date.now())
  const [wake, setWake] = useState<'on' | 'off' | 'unsupported'>('off')
  const token = useMemo(() => `medguard://p/${profile.id}?t=${issued.toString(36)}${Math.random().toString(36).slice(2, 8)}`, [profile.id, issued])
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    if (!('wakeLock' in navigator)) {
      setWake('unsupported')
      return
    }
    navigator.wakeLock
      .request('screen')
      .then((l) => {
        lock = l
        setWake('on')
      })
      .catch(() => setWake('off'))
    return () => {
      lock?.release().catch(() => {})
    }
  }, [])
  const left = issued + QR_TTL - now
  const expired = left <= 0
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center overflow-y-auto bg-surface px-6 py-6">
      <div className="flex w-full max-w-[440px] items-center">
        <button type="button" aria-label={t('Close')} onClick={() => nav(-1)} className="grid size-12 place-items-center rounded-full hover:bg-primary-50">
          <X className="size-6" />
        </button>
        <h1 className="flex-1 text-center text-h2 font-semibold">{t('My QR code')}</h1>
        <span className="size-12" />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-4">
        <div className={cx('rounded-card border-2 p-4', expired ? 'border-border-subtle opacity-30' : 'border-primary-600')}>
          <QRCodeSVG value={token} size={288} level="M" marginSize={2} title={t('QR code for {name}', { name: profile.name })} />
        </div>
        <p className="text-h2 font-semibold">{profile.name}</p>
        {expired ? (
          <StatusChip status="expired" label={t('Code expired')} />
        ) : (
          <p className="text-body text-ink-700 tabular" aria-live="off">
            {t('Expires in {time}', { time: countdown(left) })}
          </p>
        )}
        <p className="max-w-xs text-center text-small text-ink-700">{t('Hospital staff scan this to open your record. Hospitals keep access until discharge; doctors for 24 hours.')}</p>
        <p className="flex items-center gap-1 text-caption text-ink-700">
          <Sun className="size-4" aria-hidden /> {wake === 'on' ? t('Screen stays on while this is open') : t('Turn your screen brightness up')}
        </p>
      </div>
      <div className="w-full max-w-[440px] pb-4">
        <Button full icon={RefreshCw} variant={expired ? 'primary' : 'secondary'} onClick={() => setIssued(Date.now())}>
          {t('Refresh code')}
        </Button>
      </div>
    </div>
  )
}

/** H48 Share with a doctor: pick a doctor or create a link; duration; which sections */
export function ShareDoctor() {
  const { s, profile, mutate, toast, can, online } = useApp()
  const t = useT()
  const nav = useNavigate()
  const [q] = useSearchParams()
  const [doctor, setDoctor] = useState('Dr. Karim Hossain')
  const [dur, setDur] = useState('24')
  const [secs, setSecs] = useState<string[]>(['conditions', 'medicines', 'tests'])
  const [link, setLink] = useState('')
  const caseId = q.get('case')
  if (!can('share'))
    return (
      <Screen>
        <PageHeader title={t('Share with a doctor')} />
        <NoAccess owner={s.account.name} />
      </Screen>
    )
  const doctors = Array.from(new Set(s.items.filter((i) => i.section === 'doctors').map((i) => i.title)))
  return (
    <Screen>
      <PageHeader title={t('Share with a doctor')} sub={t('{name}’s record', { name: profile.name })} />
      {caseId && <Note tone="info" className="mb-4">{t('The similar case you opened is included.')}</Note>}
      <Radio
        name="doc"
        legend={t('Who?')}
        value={doctor}
        onChange={setDoctor}
        options={[...doctors.map((d) => ({ value: d, label: d, desc: t('Verified doctor') })), { value: 'link', label: t('Create a link'), desc: t('For a doctor not on MedGuard') }]}
      />
      <div className="mt-6">
        <Radio name="dur" legend={t('For how long?')} value={dur} onChange={setDur} options={[{ value: '1', label: t('1 hour') }, { value: '24', label: t('24 hours') }, { value: '168', label: t('7 days') }]} />
      </div>
      <SectionTitle>{t('What they can see')}</SectionTitle>
      <Card className="py-1">
        {SECTIONS.map((x) => (
          <Checkbox key={x.key} label={t(x.label)} checked={secs.includes(x.key)} onChange={(v) => setSecs(v ? [...secs, x.key] : secs.filter((y) => y !== x.key))} />
        ))}
      </Card>
      <p className="mt-2 text-small text-ink-700">{t('Allergies are always shared, for safety.')}</p>
      {link && (
        <Card className="mt-4">
          <p className="text-small font-semibold text-ink-700">{t('Your link')}</p>
          <p className="truncate font-semibold text-primary-700">{link}</p>
          <Button
            variant="secondary"
            icon={Copy}
            className="mt-2"
            onClick={() => {
              navigator.clipboard?.writeText(link).catch(() => {})
              toast(t('Link copied'))
            }}
          >
            {t('Copy link')}
          </Button>
        </Card>
      )}
      <ActionBar>
        <Button
          full
          disabled={!secs.length || !online}
          onClick={() => {
            const until = new Date(Date.now() + Number(dur) * 3600000).toISOString()
            const who = doctor === 'link' ? t('Anyone with the link') : doctor
            mutate((d) => {
              d.grants.push({ id: uid('g'), profileId: profile.id, who, kind: doctor === 'link' ? 'link' : 'doctor', until, sections: secs })
              d.accessLog.unshift({ id: uid('l'), profileId: profile.id, who: t('You'), action: 'shared', at: new Date().toISOString(), reason: who })
            })
            if (doctor === 'link') setLink(`https://medguard.example/s/${Math.random().toString(36).slice(2, 10)}`)
            else {
              toast(t('Shared with {who} until {time}', { who, time: `${fmtDate(until)}, ${fmtTime(until)}` }))
              nav('/share/access')
            }
          }}
        >
          {doctor === 'link' ? t('Create link') : t('Share record')}
        </Button>
      </ActionBar>
    </Screen>
  )
}

/** H49 Who has access: hospitals, doctors, caregivers; Revoke (confirm) */
export function WhoHasAccess() {
  const { s, profile, mutate, toast, can } = useApp()
  const t = useT()
  const [rev, setRev] = useState<string | null>(null)
  const { state, retry } = useFakeLoad('access')
  const grants = s.grants.filter((g) => g.profileId === profile.id && (!g.until || new Date(g.until) > new Date()))
  const hosp = profile.hospital?.state === 'admitted' ? [{ id: 'hosp', who: profile.hospital.hospital, kind: 'hospital' as const, until: undefined }] : []
  const all = [...hosp, ...grants]
  const icon = { hospital: Building2, doctor: Stethoscope, caregiver: UserRound, link: Link2 }
  const target = all.find((g) => g.id === rev)
  return (
    <Screen>
      <PageHeader title={t('Who has access')} sub={t('{name}’s record', { name: profile.name })} action={<Button variant="tertiary" to="/share/log" className="px-3">{t('Access log')}</Button>} />
      <Loadable state={state} retry={retry}>
        {all.length ? (
          <List>
            {all.map((g) => (
              <ListRow
                key={g.id}
                icon={icon[g.kind]}
                title={g.who}
                sub={g.kind === 'hospital' ? t('Until discharge') : g.kind === 'caregiver' ? t('Caregiver') : g.until ? t('Until {time}', { time: fmtDateTime(g.until) }) : ''}
                right={
                  can('share') && g.kind !== 'hospital' ? (
                    <Button variant="tertiary" className="px-3 text-danger-text" onClick={() => setRev(g.id)}>
                      {t('Revoke')}
                    </Button>
                  ) : (
                    <StatusChip status="active" />
                  )
                }
              />
            ))}
          </List>
        ) : (
          <EmptyState art="people" text={t('Only you can see this record.')} action={can('share') && <Button to="/share/doctor">{t('Share with a doctor')}</Button>} />
        )}
      </Loadable>
      <ConfirmDialog
        open={!!target}
        onClose={() => setRev(null)}
        title={t('Revoke access for {who}?', { who: target?.who ?? '' })}
        body={t('They will not be able to open the record again unless you share it.')}
        confirmLabel={t('Revoke access')}
        destructive
        onConfirm={() => {
          mutate((d) => {
            d.grants = d.grants.filter((g) => g.id !== rev)
            d.caregivers = d.caregivers.filter((c) => !(c.profileId === profile.id && c.name === target?.who))
            d.accessLog.unshift({ id: uid('l'), profileId: profile.id, who: t('You'), action: 'revoked', at: new Date().toISOString(), reason: target?.who })
          })
          toast(t('Access revoked'))
        }}
      />
    </Screen>
  )
}

/** H50 Access log: every view/edit; emergency rows marked red */
export function AccessLog() {
  const { s, profile } = useApp()
  const t = useT()
  const { state, retry } = useFakeLoad('log')
  const rows = s.accessLog.filter((l) => l.profileId === profile.id).sort((a, b) => b.at.localeCompare(a.at))
  const ic = { viewed: Eye, edited: Pencil, added: FilePlus, emergency: ShieldAlert, shared: Link2, revoked: X }
  return (
    <Screen>
      <PageHeader title={t('Access log')} sub={t('Every view and change, newest first.')} />
      <Loadable state={state} retry={retry}>
        <ul className="flex flex-col gap-2">
          {rows.map((l) => {
            const I = ic[l.action]
            const em = l.action === 'emergency'
            return (
              <li key={l.id}>
                <Card to={em ? `/share/emergency/${l.emergencyId}` : undefined} className={cx(em && 'border-danger-border bg-danger-bg')}>
                  <div className="flex items-start gap-3">
                    <I className={cx('mt-0.5 size-5 shrink-0', em ? 'text-danger-text' : 'text-ink-700')} aria-hidden />
                    <div className="flex-1">
                      <p className={cx('font-semibold', em && 'text-danger-text')}>
                        {em ? t('Emergency access') + ': ' : ''}
                        {l.who}
                      </p>
                      <p className="text-small text-ink-700">
                        {t(l.action[0].toUpperCase() + l.action.slice(1))}
                        {l.reason && ` · ${l.reason}`}
                      </p>
                      <p className="text-caption text-ink-700 tabular">{fmtDateTime(l.at)}</p>
                    </div>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      </Loadable>
    </Screen>
  )
}

/** H51 Emergency access notice: hospital, staff, time, reason; Report misuse */
export function EmergencyNotice() {
  const { id } = useParams()
  const { s, mutate, toast } = useApp()
  const t = useT()
  const [rep, setRep] = useState(false)
  const l = s.accessLog.find((x) => x.emergencyId === id)
  if (!l) return <Screen><PageHeader title={t('Not found')} /></Screen>
  const [staff, hospital] = l.who.split(', ')
  const p = s.profiles.find((x) => x.id === l.profileId)!
  return (
    <Screen>
      <PageHeader title={t('Emergency access')} />
      <Note tone="danger" icon={ShieldAlert}>
        <span className="font-semibold">{t('{h} opened {name}’s record without a QR scan.', { h: hospital ?? l.who, name: p.name })}</span>
      </Note>
      <List className="mt-4">
        <ListRow icon={Building2} title={hospital ?? '—'} sub={t('Hospital')} />
        <ListRow icon={UserRound} title={staff} sub={t('Staff member')} />
        <ListRow icon={Eye} title={<span className="tabular">{fmtDateTime(l.at)}</span>} sub={t('When')} />
        <ListRow icon={AlertTriangle} title={l.reason ?? '—'} sub={t('Reason they gave')} />
      </List>
      <p className="mt-4 text-body text-ink-700">{t('Emergency access is for patients who cannot show their QR, such as someone unconscious. If this looks wrong, report it. The hospital and MedGuard both review reports.')}</p>
      <Button full variant="destructive" icon={Flag} className="mt-6" onClick={() => setRep(true)}>
        {t('Report misuse')}
      </Button>
      <ConfirmDialog
        open={rep}
        onClose={() => setRep(false)}
        title={t('Report misuse?')}
        body={t('We send your report to {h} and the MedGuard team. You will hear back within 3 days.', { h: hospital ?? l.who })}
        reason={t('What is wrong?')}
        reasonRequired
        confirmLabel={t('Send report')}
        destructive
        onConfirm={() => {
          mutate((d) => {
            d.notifications.unshift({ id: uid('n'), kind: 'access', title: t('Misuse report sent'), body: t('We will reply within 3 days.'), at: new Date().toISOString(), read: true, tier: 'normal' })
          })
          toast(t('Report sent'))
        }}
      />
    </Screen>
  )
}

