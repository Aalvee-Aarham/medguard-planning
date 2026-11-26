import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown, ChevronUp, Download, Fingerprint, Globe, Laptop, Mail, Phone, PlayCircle, ShieldCheck, Smartphone, Trash2,
} from 'lucide-react'
import { useApp } from '../../state/store'
import { useT } from '../../i18n'
import { ActionBar, Button, Card, Checkbox, cx, Input, List, ListRow, Note, PageHeader, Radio, Screen, SectionTitle, Select, Stack, Textarea, Toggle } from '../../components/ui'
import { StatusChip } from '../../components/status'
import { ConfirmDialog } from '../../components/overlays'
import { Otp, StrengthMeter, passwordStrength } from '../onboarding/Auth'
import { SELF } from '../../mock/seed'
import { fmtDate } from '../../lib/format'

/** S1 Settings home + S17 Log out: see SettingsHub.tsx */
export { SettingsHome } from './SettingsHub'

/** S2 Edit personal info */
export function PersonalInfo() {
  const { s, mutate, toast } = useApp()
  const t = useT()
  const nav = useNavigate()
  const me = s.profiles.find((p) => p.id === s.activeProfileId) ?? s.profiles.find((p) => p.id === SELF)!
  const [f, setF] = useState({ name: me.name, dob: me.dob, sex: me.sex as string, blood: me.bloodGroup ?? '' })
  return (
    <Screen>
      <PageHeader title={t('Personal info')} sub={me.id !== SELF ? t('For {name}', { name: me.name }) : undefined} />
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          mutate((d) => {
            const p = d.profiles.find((x) => x.id === me.id)!
            Object.assign(p, { name: f.name, dob: f.dob, sex: f.sex, bloodGroup: f.blood || undefined })
            if (p.id === SELF) d.account.name = f.name
          })
          toast(t('Changes saved'))
          nav(-1)
        }}
      >
        <Input label={t('Photo')} type="file" accept="image/*" />
        <Input label={t('Full name')} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input label={t('Date of birth')} type="date" value={f.dob} onChange={(e) => setF({ ...f, dob: e.target.value })} />
        <Radio name="sx" legend={t('Sex')} value={f.sex} onChange={(v) => setF({ ...f, sex: v })} options={[{ value: 'female', label: t('Female') }, { value: 'male', label: t('Male') }, { value: 'other', label: t('Other') }]} />
        <Select label={t('Blood group (optional)')} value={f.blood} onChange={(e) => setF({ ...f, blood: e.target.value })}>
          <option value="">{t('Not sure')}</option>
          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => (
            <option key={b}>{b}</option>
          ))}
        </Select>
        <Button full type="submit">
          {t('Save changes')}
        </Button>
      </form>
    </Screen>
  )
}

/** S3 Change phone: OTP to old number, then new number */
export function ChangePhone() {
  const { mutate, toast } = useApp()
  const t = useT()
  const nav = useNavigate()
  const [step, setStep] = useState<'old' | 'new' | 'otp2'>('old')
  const [n, setN] = useState('')
  if (step === 'old') return <Otp title={t('Confirm it’s you')} onDone={() => setStep('new')} />
  if (step === 'otp2')
    return (
      <Otp
        title={t('Code sent to your new number')}
        onDone={() => {
          mutate((d) => void (d.account.phone = '+880 ' + n))
          toast(t('Phone number changed'))
          nav('/settings')
        }}
      />
    )
  return (
    <Screen>
      <PageHeader title={t('New phone number')} />
      <Input label={t('Mobile number')} inputMode="tel" value={n} onChange={(e) => setN(e.target.value)} hint="+880" />
      <Button full className="mt-6" disabled={n.replace(/\D/g, '').length < 10} onClick={() => setStep('otp2')}>
        {t('Send code')}
      </Button>
    </Screen>
  )
}

/** S4 Change email */
export function ChangeEmail() {
  const { s, mutate, toast } = useApp()
  const t = useT()
  const [e, setE] = useState('')
  const [sent, setSent] = useState(false)
  return (
    <Screen>
      <PageHeader title={t('Change email')} sub={t('Now: {email}', { email: s.account.email ?? '—' })} />
      {sent ? (
        <Stack>
          <Note tone="success" icon={Mail}>
            {t('We sent a link to {email}. It works for 30 minutes.', { email: e })}
          </Note>
          <Button
            full
            onClick={() => {
              mutate((d) => void (d.account.email = e))
              toast(t('Email changed'))
            }}
          >
            {t('I tapped the link (demo)')}
          </Button>
        </Stack>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={(ev) => (ev.preventDefault(), setSent(true))}>
          <Input label={t('New email')} type="email" required value={e} onChange={(ev) => setE(ev.target.value)} />
          <Button full type="submit">
            {t('Send verification link')}
          </Button>
        </form>
      )}
    </Screen>
  )
}

/** S5 Change password */
export function ChangePassword() {
  const { toast } = useApp()
  const t = useT()
  const nav = useNavigate()
  const [f, setF] = useState({ cur: '', pw: '', again: '' })
  const mismatch = f.again && f.pw !== f.again
  return (
    <Screen>
      <PageHeader title={t('Change password')} />
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          toast(t('Password changed'))
          nav('/settings')
        }}
      >
        <Input label={t('Current password')} type="password" autoComplete="current-password" value={f.cur} onChange={(e) => setF({ ...f, cur: e.target.value })} />
        <Input label={t('New password')} type="password" autoComplete="new-password" value={f.pw} onChange={(e) => setF({ ...f, pw: e.target.value })} />
        <StrengthMeter value={f.pw} />
        <Input label={t('New password again')} type="password" autoComplete="new-password" value={f.again} onChange={(e) => setF({ ...f, again: e.target.value })} error={mismatch ? t('The two passwords do not match.') : undefined} />
        <Button full type="submit" disabled={!f.cur || passwordStrength(f.pw) < 2 || f.pw !== f.again}>
          {t('Save new password')}
        </Button>
      </form>
    </Screen>
  )
}

/** S6 Sign-in methods: at least one stays (last one's Remove disabled) */
export function SignInMethods() {
  const { s, mutate } = useApp()
  const t = useT()
  const methods = [
    { k: 'phone', icon: Phone, label: t('Phone'), on: !!s.account.phone, val: s.account.phone },
    { k: 'email', icon: Mail, label: t('Email'), on: !!s.account.email, val: s.account.email },
    { k: 'google', icon: Globe, label: 'Google', on: !!s.account.google, val: s.account.google ? s.account.email : undefined },
  ]
  const active = methods.filter((m) => m.on).length
  return (
    <Screen>
      <PageHeader title={t('Sign-in methods')} sub={t('Keep at least one.')} />
      <List>
        {methods.map((m) => (
          <ListRow
            key={m.k}
            icon={m.icon}
            title={m.label}
            sub={m.on ? m.val : t('Not added')}
            right={
              m.on ? (
                <Button
                  variant="tertiary"
                  className="px-3"
                  disabled={active <= 1}
                  aria-label={active <= 1 ? t('Can’t remove your only sign-in method') : undefined}
                  onClick={() =>
                    mutate((d) => {
                      if (m.k === 'phone') d.account.phone = undefined
                      if (m.k === 'email') d.account.email = undefined
                      if (m.k === 'google') d.account.google = false
                    })
                  }
                >
                  {t('Remove')}
                </Button>
              ) : (
                <Button
                  variant="tertiary"
                  className="px-3"
                  onClick={() =>
                    mutate((d) => {
                      if (m.k === 'phone') d.account.phone = '+880 1711 000000'
                      if (m.k === 'email') d.account.email = 'arif@example.com'
                      if (m.k === 'google') d.account.google = true
                    })
                  }
                >
                  {t('Add')}
                </Button>
              )
            }
          />
        ))}
      </List>
      {active <= 1 && <p className="mt-2 text-small text-ink-700">{t('This is your only way to sign in, so it can’t be removed.')}</p>}
    </Screen>
  )
}

/** S7 Security: biometric, auto-lock, change PIN, devices */
export function Security() {
  const { s, mutate, toast } = useApp()
  const t = useT()
  const [pin, setPin] = useState('')
  const [devices, setDevices] = useState([
    { id: 'this', name: t('This phone'), at: new Date().toISOString() },
    { id: 'tab', name: 'Samsung Galaxy Tab A8', at: new Date(Date.now() - 6 * 86400000).toISOString() },
  ])
  return (
    <Screen>
      <PageHeader title={t('Security')} />
      <Card className="py-1">
        <Toggle label={t('Unlock with fingerprint')} checked={s.settings.biometric} onChange={(v) => mutate((d) => void (d.settings.biometric = v))} />
      </Card>
      <div className="mt-4">
        <Select label={t('Lock the app after')} value={s.settings.autoLockMin} onChange={(e) => mutate((d) => void (d.settings.autoLockMin = Number(e.target.value)))}>
          {[1, 5, 15, 30].map((m) => (
            <option key={m} value={m}>
              {t('{n} minutes without use', { n: m })}
            </option>
          ))}
        </Select>
      </div>
      <SectionTitle>{t('Change PIN')}</SectionTitle>
      <div className="flex items-end gap-2">
        <Input label={t('New 4-digit PIN')} inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} className="flex-1" />
        <Button
          variant="secondary"
          disabled={pin.length !== 4}
          onClick={() => {
            mutate((d) => void (d.account.pin = pin))
            setPin('')
            toast(t('PIN changed'))
          }}
        >
          {t('Save PIN')}
        </Button>
      </div>
      <SectionTitle>{t('Signed-in devices')}</SectionTitle>
      <List>
        {devices.map((d) => (
          <ListRow
            key={d.id}
            icon={d.id === 'this' ? Smartphone : Laptop}
            title={d.name}
            sub={t('Last used {date}', { date: fmtDate(d.at) })}
            right={
              d.id === 'this' ? (
                <StatusChip status="active" label={t('This device')} />
              ) : (
                <Button variant="tertiary" className="px-3" onClick={() => (setDevices(devices.filter((x) => x.id !== d.id)), toast(t('Device logged out')))}>
                  {t('Log out')}
                </Button>
              )
            }
          />
        ))}
      </List>
      <Button full variant="tertiary" icon={Fingerprint} className="mt-4" onClick={() => mutate((d) => void (d.session.locked = true))}>
        {t('Lock now')}
      </Button>
    </Screen>
  )
}

/** S9 Text size: 4 sizes with live preview */
export function TextSize() {
  const { s, mutate } = useApp()
  const t = useT()
  const sizes = [1, 1.25, 1.5, 2] as const
  return (
    <Screen>
      <PageHeader title={t('Text size')} />
      <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label={t('Text size')}>
        {sizes.map((z) => (
          <button key={z} type="button" role="radio" aria-checked={s.settings.textSize === z} onClick={() => mutate((d) => void (d.settings.textSize = z))} className={cx('btn flex min-h-16 flex-col items-center justify-center rounded-card border-2 font-semibold', s.settings.textSize === z ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-border-subtle bg-surface')}>
            <span style={{ fontSize: 14 * z > 24 ? 24 : 14 * z }}>Aa</span>
            <span className="text-caption tabular">{z * 100}%</span>
          </button>
        ))}
      </div>
      <SectionTitle>{t('Preview')}</SectionTitle>
      <Card>
        <p className="text-h3 font-semibold">Metformin 500 mg</p>
        <p className="text-body text-ink-700 tabular">8:00 AM · {t('after food')}</p>
        <Button className="mt-3" full>
          {t('Taken')}
        </Button>
      </Card>
    </Screen>
  )
}

/** S11 Privacy and consents: dates; withdraw AI processing */
export function Privacy() {
  const { s, mutate, toast } = useApp()
  const t = useT()
  const [withdraw, setWithdraw] = useState(false)
  const c = s.settings.consents
  const row = (label: string, at?: string, locked = true) => <ListRow icon={ShieldCheck} iconTone={at ? 'success' : 'neutral'} title={t(label)} sub={at ? t('Given on {date}', { date: fmtDate(at) }) : t('Not given')} right={locked ? <StatusChip status={at ? 'active' : 'skipped'} label={at ? t('Given') : t('Off')} /> : undefined} />
  return (
    <Screen>
      <PageHeader title={t('Privacy and consents')} />
      <List>
        {row('Terms of use', c.terms)}
        {row('Privacy policy', c.privacy)}
        {row('Health data storage', c.health)}
        {row('AI processing', c.ai)}
      </List>
      <p className="mt-2 text-small text-ink-700">{t('The first three are needed to keep a record. To withdraw them, delete your account.')}</p>
      {c.ai ? (
        <Button full variant="secondary" className="mt-6" onClick={() => setWithdraw(true)}>
          {t('Withdraw AI processing')}
        </Button>
      ) : (
        <Button full className="mt-6" onClick={() => (mutate((d) => void (d.settings.consents.ai = new Date().toISOString())), toast(t('AI processing turned on')))}>
          {t('Turn on AI processing')}
        </Button>
      )}
      <ConfirmDialog
        open={withdraw}
        onClose={() => setWithdraw(false)}
        title={t('Withdraw AI processing?')}
        body={t('AI will stop reading uploads and Ask AI turns off. You can still type records in. Records already confirmed stay.')}
        confirmLabel={t('Withdraw')}
        destructive
        onConfirm={() => {
          mutate((d) => void (d.settings.consents.ai = undefined))
          toast(t('AI processing withdrawn'))
        }}
      />
    </Screen>
  )
}

/** S12 Download my data */
export function ExportData() {
  const { s, toast } = useApp()
  const t = useT()
  const [how, setHow] = useState('file')
  return (
    <Screen>
      <PageHeader title={t('Download my data')} sub={t('All records and documents for every profile you own.')} />
      <Radio name="how" legend={t('How do you want it?')} value={how} onChange={setHow} options={[{ value: 'file', label: t('Save a file on this phone') }, { value: 'email', label: t('Email it to me'), desc: s.account.email }]} />
      <ActionBar>
        <Button
          full
          icon={Download}
          onClick={() => {
            if (how === 'file') {
              const blob = new Blob([JSON.stringify({ profiles: s.profiles, records: s.items, medicines: s.medicines, tests: s.tests, documents: s.documents, admissions: s.admissions }, null, 2)], { type: 'application/json' })
              const a = document.createElement('a')
              a.href = URL.createObjectURL(blob)
              a.download = 'medguard-export.json'
              a.click()
              URL.revokeObjectURL(a.href)
              toast(t('File saved'))
            } else toast(t('We will email it within 24 hours'))
          }}
        >
          {how === 'file' ? t('Save file') : t('Email my data')}
        </Button>
      </ActionBar>
    </Screen>
  )
}

/** S13 Delete account: what is deleted, family + caregivers, 30-day grace, OTP confirm */
export function DeleteAccount() {
  const { s, mutate, can } = useApp()
  const t = useT()
  const nav = useNavigate()
  const [ok, setOk] = useState(false)
  const [otp, setOtp] = useState(false)
  if (!can('deleteAccount'))
    return (
      <Screen>
        <PageHeader title={t('Delete account')} />
        <Note tone="neutral">{t('Only the account owner can delete the account.')}</Note>
      </Screen>
    )
  if (otp)
    return (
      <Otp
        title={t('Confirm deletion')}
        onDone={() => {
          mutate((d) => (d.session = { signedIn: false, locked: false }))
          nav('/auth', { replace: true })
        }}
      />
    )
  const family = s.profiles.filter((p) => p.relation !== 'self')
  return (
    <Screen>
      <PageHeader title={t('Delete account')} />
      <Stack>
        <Note tone="danger" icon={Trash2}>
          <span className="font-semibold">{t('Your account will be deleted in 30 days.')}</span>
          <span className="block text-small">{t('Sign in before then to cancel.')}</span>
        </Note>
        <Card>
          <p className="font-semibold">{t('What is deleted')}</p>
          <ul className="mt-1 text-body text-ink-700">
            <li>• {t('Your record, documents and reminders')}</li>
            <li>• {t('Family profiles you created: {names}', { names: family.map((p) => p.name).join(', ') || '—' })}</li>
            <li>• {t('Caregivers lose access to these profiles')}</li>
          </ul>
          <p className="mt-3 font-semibold">{t('What is kept')}</p>
          <p className="text-body text-ink-700">{t('Hospitals keep their own copy of stay records, as the law requires.')}</p>
        </Card>
        <Checkbox label={t('I understand this cannot be undone after 30 days')} checked={ok} onChange={setOk} />
        <Button full variant="destructive" disabled={!ok} onClick={() => setOtp(true)}>
          {t('Delete my account')}
        </Button>
      </Stack>
    </Screen>
  )
}

const FAQ = [
  ['Is MedGuard a doctor?', 'No. It keeps your records in one place and explains them in plain words. Always ask your doctor about treatment.'],
  ['Who can see my record?', 'Only you, the family members you add, and doctors or hospitals you share it with. Every view is logged in Access log.'],
  ['What if the AI reads something wrong?', 'Nothing is saved until you check it. Fields that were hard to read are highlighted in amber. You can edit any field.'],
  ['Does it work without internet?', 'Yes for your record, medicines and reminders. Uploads and Ask AI need internet.'],
  ['How does a hospital open my record?', 'Show your QR code at the desk. In an emergency, a senior nurse or doctor can open it with a reason; you are told straight away.'],
]

/** S14 Help and FAQ: search, answers, short videos */
export function Help() {
  const t = useT()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<number | null>(null)
  const list = FAQ.map(([a, b], i) => ({ i, q: t(a), a: t(b) })).filter((x) => (x.q + x.a).toLowerCase().includes(q.toLowerCase()))
  return (
    <Screen>
      <PageHeader title={t('Help')} />
      <Input label={t('Search help')} type="search" value={q} onChange={(e) => setQ(e.target.value)} />
      <SectionTitle>{t('Short videos')}</SectionTitle>
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
        {['Upload a prescription', 'Show your QR at a hospital', 'Set a medicine reminder'].map((v) => (
          <button key={v} type="button" className="card-link flex w-44 shrink-0 flex-col gap-2 rounded-card border border-border-subtle bg-surface p-3 text-left">
            <span className="grid aspect-video place-items-center rounded-control bg-primary-50 text-primary-600">
              <PlayCircle className="size-10" strokeWidth={1.5} aria-hidden />
            </span>
            <span className="text-small font-semibold">{t(v)}</span>
            <span className="text-caption text-ink-700 tabular">1:20</span>
          </button>
        ))}
      </div>
      <SectionTitle>{t('Questions')}</SectionTitle>
      <List>
        {list.map((x) => (
          <div key={x.i}>
            <button type="button" aria-expanded={open === x.i} onClick={() => setOpen(open === x.i ? null : x.i)} className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left font-semibold hover:bg-primary-50">
              <span className="flex-1">{x.q}</span>
              {open === x.i ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
            </button>
            {open === x.i && <p className="px-4 pb-4 text-body text-ink-700">{x.a}</p>}
          </div>
        ))}
      </List>
      {!list.length && <p className="mt-2 text-ink-700">{t('No answers match. Contact support below.')}</p>}
      <Button full variant="secondary" className="mt-6" to="/help/contact">
        {t('Contact support')}
      </Button>
    </Screen>
  )
}

/** S15 Contact support: describe + attach screenshot */
export function ContactSupport() {
  const { toast, online } = useApp()
  const t = useT()
  const nav = useNavigate()
  const [text, setText] = useState('')
  return (
    <Screen>
      <PageHeader title={t('Contact support')} />
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          toast(t('Message sent. We reply within 1 working day.'))
          nav(-1)
        }}
      >
        <Textarea label={t('What happened?')} rows={6} value={text} onChange={(e) => setText(e.target.value)} />
        <Input label={t('Screenshot (optional)')} type="file" accept="image/*" />
        <Button full type="submit" disabled={!text.trim() || !online}>
          {t('Send message')}
        </Button>
      </form>
    </Screen>
  )
}

/** S16 About and legal */
export function About() {
  const t = useT()
  return (
    <Screen>
      <PageHeader title={t('About MedGuard')} />
      <Card>
        <p className="text-h3 font-semibold">MedGuard Health Profile</p>
        <p className="text-body text-ink-700 tabular">{t('Version')} 0.1.0</p>
        <p className="mt-2 text-small text-ink-700">{t('Made by Team O(1), Ahsanullah University of Science and Technology.')}</p>
      </Card>
      <List className="mt-4">
        <ListRow title={t('Terms of use')} to="/about" />
        <ListRow title={t('Privacy policy')} to="/about" />
        <ListRow title={t('Open-source licences')} sub="React, Three.js, GSAP, anime.js, Recharts, Lucide" />
        <ListRow title={t('Similar-case data')} sub="PMC-Patients (Scientific Data, 2023)" />
        <ListRow title={t('3D anatomy model')} sub="Anatomy 3D models (lucgrn3/anatomy-models), from Z-Anatomy, BodyParts3D (DBCLS), NIH 3D and Sketchfab authors. CC BY-SA 4.0" />
      </List>
    </Screen>
  )
}
