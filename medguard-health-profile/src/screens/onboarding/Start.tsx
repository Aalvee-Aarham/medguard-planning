import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CloudOff, Fingerprint, Stethoscope, Users } from 'lucide-react'
import { useApp } from '../../state/store'
import { useT } from '../../i18n'
import { Button, Checkbox, Input, PageHeader, Radio, Screen, Select, Stack, cx, Note } from '../../components/ui'
import { LogoDraw } from '../../components/CheckDraw'
import { SELF } from '../../mock/seed'

/** H1 Splash: logo, loading, offline check. Returning user -> H16 lock. */
export function Splash() {
  const { s, online } = useApp()
  const t = useT()
  const nav = useNavigate()
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (!s.settings.onboarded) nav('/start/language', { replace: true })
      else if (!s.session.signedIn) nav('/auth', { replace: true })
      else nav('/lock', { replace: true, state: { to: '/home' } })
    }, 1400)
    return () => window.clearTimeout(id)
  }, [nav, s.settings.onboarded, s.session.signedIn])
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6">
      <LogoDraw size={96} />
      <h1 className="text-display font-bold text-primary-700">MedGuard</h1>
      <div className="h-1 w-32 overflow-hidden rounded-full bg-primary-100" role="progressbar" aria-label={t('Loading')}>
        <div className="skeleton h-full w-1/2 rounded-full bg-primary-600" />
      </div>
      {!online && (
        <p className="flex items-center gap-2 text-small text-warning-text">
          <CloudOff className="size-4" aria-hidden /> {t('Offline. Saved data will open.')}
        </p>
      )}
    </div>
  )
}

/** H2 Language: two large buttons. Both scripts shown so anyone can read their option. */
export function Language({ settings = false }: { settings?: boolean }) {
  const { s, mutate, toast } = useApp()
  const nav = useNavigate()
  const t = useT()
  const pick = (lang: 'en' | 'bn') => {
    mutate((d) => {
      d.settings.lang = lang
    })
    if (settings) toast(lang === 'bn' ? 'ভাষা বদলানো হয়েছে' : 'Language changed')
    else nav('/start/welcome')
  }
  return (
    <Screen className={cx(!settings && 'flex min-h-dvh flex-col justify-center')}>
      {settings && <PageHeader title={t('Language')} />}
      {!settings && <h1 className="mb-2 text-h1 font-semibold">ভাষা বেছে নিন · Choose your language</h1>}
      {!settings && <p className="mb-6 text-body text-ink-700">{t('You can change this any time in Settings.')}</p>}
      <Stack gap={3}>
        {(['bn', 'en'] as const).map((l) => (
          <button
            key={l}
            type="button"
            lang={l}
            aria-pressed={s.settings.lang === l}
            onClick={() => pick(l)}
            className={cx(
              'btn flex min-h-20 items-center justify-center rounded-card border-2 text-h2 font-semibold',
              s.settings.lang === l && settings ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-border-subtle bg-surface hover:border-primary-600',
            )}
          >
            {l === 'bn' ? 'বাংলা' : 'English'}
          </button>
        ))}
      </Stack>
    </Screen>
  )
}

/** H11 Consent: 4 separate boxes. Continue needs the first 3; AI is optional. */
export function Consent() {
  const { mutate } = useApp()
  const t = useT()
  const nav = useNavigate()
  const [c, setC] = useState({ terms: false, privacy: false, health: false, ai: true })
  const rows: { k: keyof typeof c; title: string; sum: string }[] = [
    { k: 'terms', title: 'I accept the terms of use', sum: 'MedGuard helps you keep records. It does not replace your doctor.' },
    { k: 'privacy', title: 'I accept the privacy policy', sum: 'We never sell your data. You can download or delete it any time.' },
    { k: 'health', title: 'I allow MedGuard to store my health data', sum: 'Needed to keep your record. Stored encrypted.' },
    { k: 'ai', title: 'I allow AI to read my documents (optional)', sum: 'AI reads uploads and answers questions about your reports. Off means you type records in yourself.' },
  ]
  const ok = c.terms && c.privacy && c.health
  return (
    <Screen>
      <h1 className="text-h1 font-semibold">{t('Before you start')}</h1>
      <p className="mt-1 mb-4 text-body text-ink-700">{t('Tick each one you agree to.')}</p>
      <div className="flex flex-col divide-y divide-border-subtle rounded-card border border-border-subtle bg-surface px-4">
        {rows.map((r) => (
          <Checkbox key={r.k} label={t(r.title)} checked={c[r.k]} onChange={(v) => setC({ ...c, [r.k]: v })}>
            <p className="text-small text-ink-700">{t(r.sum)}</p>
            <a href="#full" onClick={(e) => e.preventDefault()} className="inline-flex min-h-10 items-center text-small font-semibold text-primary-600 underline">
              {t('Read the full text')}
            </a>
          </Checkbox>
        ))}
      </div>
      {!ok && <p className="mt-3 text-small text-ink-700">{t('Tick the first three to continue.')}</p>}
      <Button
        full
        className="mt-6"
        disabled={!ok}
        onClick={() => {
          const now = new Date().toISOString()
          mutate((d) => {
            d.settings.consents = { terms: now, privacy: now, health: now, ai: c.ai ? now : undefined }
          })
          nav('/start/account-type')
        }}
      >
        {t('Continue')}
      </Button>
    </Screen>
  )
}

/** H12 Account type */
export function AccountType() {
  const { mutate } = useApp()
  const t = useT()
  const nav = useNavigate()
  const opt = (icon: typeof Users, title: string, sub: string, go: () => void) => {
    const I = icon
    return (
      <button type="button" onClick={go} className="btn card-link flex min-h-24 items-center gap-4 rounded-card border-2 border-border-subtle bg-surface p-4 text-left hover:border-primary-600">
        <span className="grid size-12 place-items-center rounded-full bg-primary-50 text-primary-600">
          <I className="size-6" strokeWidth={1.75} aria-hidden />
        </span>
        <span>
          <span className="block text-h3 font-semibold">{title}</span>
          <span className="block text-small text-ink-700">{sub}</span>
        </span>
      </button>
    )
  }
  return (
    <Screen>
      <h1 className="mb-6 text-h1 font-semibold">{t('Who is this account for?')}</h1>
      <Stack gap={3}>
        {opt(Users, t('For myself or my family'), t('Keep records for you and the people you care for.'), () => {
          mutate((d) => {
            d.account.type = 'personal'
          })
          nav('/start/profile')
        })}
        {opt(Stethoscope, t('I’m a doctor'), t('View records patients share with you. Needs your BMDC number.'), () => nav('/doctor/verify'))}
      </Stack>
    </Screen>
  )
}

/** H13 Create first profile */
export function FirstProfile() {
  const { s, mutate } = useApp()
  const t = useT()
  const nav = useNavigate()
  const me = s.profiles.find((p) => p.id === SELF)!
  const [f, setF] = useState({ name: me.name, dob: me.dob, sex: me.sex as string, blood: me.bloodGroup ?? '' })
  const [err, setErr] = useState('')
  return (
    <Screen>
      <h1 className="text-h1 font-semibold">{t('Your profile')}</h1>
      <p className="mt-1 mb-6 text-body text-ink-700">{t('Start with yourself. You can add family later.')}</p>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!f.name.trim()) return setErr(t('Enter your full name.'))
          mutate((d) => {
            const p = d.profiles.find((x) => x.id === SELF)!
            p.name = f.name.trim()
            p.dob = f.dob
            p.sex = f.sex as 'male'
            p.bloodGroup = f.blood || undefined
            d.account.name = f.name.trim()
          })
          nav('/start/biometric')
        }}
      >
        <Input label={t('Full name')} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={err} autoComplete="name" />
        <Input label={t('Date of birth')} type="date" value={f.dob} onChange={(e) => setF({ ...f, dob: e.target.value })} />
        <Radio name="sex" legend={t('Sex')} value={f.sex} onChange={(v) => setF({ ...f, sex: v })} options={[{ value: 'female', label: t('Female') }, { value: 'male', label: t('Male') }, { value: 'other', label: t('Other') }]} />
        <Select label={t('Blood group (optional)')} value={f.blood} onChange={(e) => setF({ ...f, blood: e.target.value })}>
          <option value="">{t('Not sure')}</option>
          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => (
            <option key={b}>{b}</option>
          ))}
        </Select>
        <Input label={t('Photo (optional)')} type="file" accept="image/*" />
        <Button full type="submit" className="mt-2">
          {t('Save profile')}
        </Button>
      </form>
    </Screen>
  )
}

/** H14 Biometric setup (mock prompt) */
export function Biometric() {
  const { mutate } = useApp()
  const t = useT()
  const nav = useNavigate()
  const [asking, setAsking] = useState(false)
  return (
    <Screen className="flex min-h-dvh flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <span className="grid size-20 place-items-center rounded-full bg-primary-50 text-primary-600">
          <Fingerprint className="size-10" strokeWidth={1.75} aria-hidden />
        </span>
        <h1 className="text-h1 font-semibold">{t('Unlock with fingerprint or face?')}</h1>
        <p className="max-w-sm text-body text-ink-700">{t('Your record has private health data. Unlocking with your fingerprint is faster than a PIN.')}</p>
        {asking && (
          <Note tone="info" icon={Fingerprint} className="w-full text-left">
            {t('Touch the sensor to confirm.')}{' '}
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => {
                mutate((d) => {
                  d.settings.biometric = true
                })
                nav('/start/notifications')
              }}
            >
              {t('Simulate touch')}
            </button>
          </Note>
        )}
      </div>
      <Stack gap={2}>
        <Button full onClick={() => setAsking(true)}>
          {t('Turn on fingerprint')}
        </Button>
        <Button full variant="tertiary" to="/start/notifications">
          {t('Not now')}
        </Button>
      </Stack>
    </Screen>
  )
}

/** H15 Notification permission: explain why, then the browser prompt */
export function NotifPermission() {
  const { s, mutate } = useApp()
  const t = useT()
  const nav = useNavigate()
  const done = () => {
    mutate((d) => {
      d.settings.onboarded = true
      d.session.signedIn = true
    })
    nav(s.account.type === 'doctor' ? '/doctor' : '/home', { replace: true })
  }
  return (
    <Screen className="flex min-h-dvh flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <span className="grid size-20 place-items-center rounded-full bg-primary-50 text-primary-600">
          <Bell className="size-10" strokeWidth={1.75} aria-hidden />
        </span>
        <h1 className="text-h1 font-semibold">{t('Get medicine reminders')}</h1>
        <ul className="max-w-sm text-left text-body text-ink-700">
          <li className="py-1">• {t('Reminders when a medicine is due')}</li>
          <li className="py-1">• {t('An alert when someone opens your record')}</li>
          <li className="py-1">• {t('News from the hospital during a stay')}</li>
        </ul>
      </div>
      <Stack gap={2}>
        <Button
          full
          onClick={async () => {
            try {
              if ('Notification' in window) await Notification.requestPermission()
            } catch {
              /* blocked: the inbox still works */
            }
            done()
          }}
        >
          {t('Allow notifications')}
        </Button>
        <Button full variant="tertiary" onClick={done}>
          {t('Not now')}
        </Button>
      </Stack>
    </Screen>
  )
}
