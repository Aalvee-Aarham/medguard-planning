import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Delete, Fingerprint, Mail, MailCheck, Phone } from 'lucide-react'
import { useApp } from '../../state/store'
import { useT } from '../../i18n'
import { Button, Input, PageHeader, Screen, Stack, cx, Note } from '../../components/ui'
import { LogoDraw } from '../../components/CheckDraw'
import { fakeDelay } from '../../mock/api'

/** After any sign-in: consent first if not given yet, else Home */
function useAfterAuth() {
  const { s, mutate } = useApp()
  const nav = useNavigate()
  return () => {
    if (s.settings.consents.terms) {
      mutate((d) => {
        d.session.signedIn = true
        d.session.locked = false
        d.settings.onboarded = true
      })
      nav('/home', { replace: true })
    } else nav('/start/consent')
  }
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  )
}

/** H4 Sign in or sign up */
export function AuthHome() {
  const t = useT()
  const after = useAfterAuth()
  const [g, setG] = useState(false)
  return (
    <Screen className="flex min-h-dvh flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <LogoDraw size={72} />
        <h1 className="text-h1 font-semibold">{t('Sign in or create an account')}</h1>
        <p className="max-w-xs text-body text-ink-700">{t('Use the same way each time you sign in.')}</p>
      </div>
      <Stack gap={3}>
        <Button full icon={Phone} to="/auth/phone">
          {t('Continue with phone')}
        </Button>
        <Button full variant="secondary" icon={Mail} to="/auth/email/login">
          {t('Continue with email')}
        </Button>
        <Button
          full
          variant="secondary"
          loading={g}
          onClick={async () => {
            setG(true)
            await fakeDelay(null)
            after()
          }}
        >
          {!g && <GoogleMark />}
          {t('Continue with Google')}
        </Button>
        <Button full variant="tertiary" to="/auth/email/signup">
          {t('New here? Sign up with email')}
        </Button>
      </Stack>
    </Screen>
  )
}

/** H5 Phone number: +880 prefilled */
export function PhoneEntry() {
  const { mutate } = useApp()
  const t = useT()
  const nav = useNavigate()
  const [n, setN] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Screen>
      <PageHeader title={t('Your phone number')} sub={t('We will text you a 6-digit code.')} />
      <form
        className="flex flex-col gap-6"
        onSubmit={async (e) => {
          e.preventDefault()
          const digits = n.replace(/\D/g, '')
          if (!/^1[3-9]\d{8}$/.test(digits)) return setErr(t('Enter 10 digits after +880, starting with 1. Example: 1711 000000'))
          setBusy(true)
          await fakeDelay(null)
          mutate((d) => {
            d.session.pendingPhone = '+880 ' + digits
          })
          nav('/auth/otp')
        }}
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="ph" className="text-small font-semibold text-ink-700">
            {t('Mobile number')}
          </label>
          <div className="flex h-12 overflow-hidden rounded-control border border-border-input focus-within:border-2 focus-within:border-primary-600 focus-within:ring-4 focus-within:ring-primary-100">
            <span className="grid place-items-center bg-neutral-bg px-3 font-semibold text-ink-700 tabular">+880</span>
            <input id="ph" inputMode="tel" autoComplete="tel-national" className="flex-1 px-3 text-body tabular focus:outline-none" value={n} onChange={(e) => (setN(e.target.value), setErr(''))} placeholder="1711 000000" aria-invalid={!!err} />
          </div>
          {err && (
            <p className="text-small text-danger-text" role="alert">
              {err}
            </p>
          )}
        </div>
        <Button full type="submit" loading={busy}>
          {t('Send code')}
        </Button>
      </form>
    </Screen>
  )
}

/** H6 OTP: 6 boxes, 60 s resend timer, change number. Mock code 123456. */
export function Otp({ onDone, title }: { onDone?: () => void; title?: string }) {
  const { s } = useApp()
  const t = useT()
  const after = useAfterAuth()
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [left, setLeft] = useState(60)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const refs = useRef<(HTMLInputElement | null)[]>([])
  useEffect(() => {
    if (left <= 0) return
    const id = window.setTimeout(() => setLeft(left - 1), 1000)
    return () => window.clearTimeout(id)
  }, [left])
  const submit = async (c: string[]) => {
    setBusy(true)
    await fakeDelay(null)
    setBusy(false)
    if (c.join('') !== '123456') {
      setErr(t('That code is wrong. Check the text message and try again.'))
      setCode(['', '', '', '', '', ''])
      refs.current[0]?.focus()
      return
    }
    ;(onDone ?? after)()
  }
  const set = (i: number, v: string) => {
    const digits = v.replace(/\D/g, '')
    if (digits.length > 1) {
      const all = digits.slice(0, 6).split('')
      const next = [...all, '', '', '', '', '', ''].slice(0, 6)
      setCode(next)
      if (all.length === 6) submit(next)
      return
    }
    const next = [...code]
    next[i] = digits
    setCode(next)
    setErr('')
    if (digits && i < 5) refs.current[i + 1]?.focus()
    if (next.every(Boolean)) submit(next)
  }
  return (
    <Screen>
      <PageHeader title={title ?? t('Enter the code')} sub={t('Sent to {phone}', { phone: s.session.pendingPhone ?? '+880 1711 000000' })} />
      <fieldset>
        <legend className="sr-only">{t('6-digit code')}</legend>
        <div className="flex justify-between gap-2">
          {code.map((c, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el
              }}
              aria-label={t('Digit {n}', { n: i + 1 })}
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              maxLength={6}
              value={c}
              onChange={(e) => set(i, e.target.value)}
              onKeyDown={(e) => e.key === 'Backspace' && !c && i > 0 && refs.current[i - 1]?.focus()}
              className={cx('h-14 w-full min-w-0 rounded-control border bg-surface text-center text-h1 font-semibold tabular focus:border-2 focus:border-primary-600 focus:ring-4 focus:ring-primary-100 focus:outline-none', err ? 'border-2 border-danger-text' : 'border-border-input')}
            />
          ))}
        </div>
      </fieldset>
      {err && (
        <p className="mt-2 text-small text-danger-text" role="alert">
          {err}
        </p>
      )}
      <Note tone="info" className="mt-4">
        {t('Demo: the code is 123456.')}
      </Note>
      <div className="mt-6 flex flex-col gap-2">
        <Button full loading={busy} disabled={!code.every(Boolean)} onClick={() => submit(code)}>
          {t('Verify')}
        </Button>
        <Button full variant="tertiary" disabled={left > 0} onClick={() => setLeft(60)}>
          {left > 0 ? t('Resend code in {s} s', { s: left }) : t('Resend code')}
        </Button>
        {!onDone && (
          <Button full variant="tertiary" to="/auth/phone">
            {t('Change number')}
          </Button>
        )}
      </div>
    </Screen>
  )
}

export function passwordStrength(p: string) {
  let s = 0
  if (p.length >= 8) s++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++
  if (/\d/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p) || p.length >= 12) s++
  return s
}

export function StrengthMeter({ value }: { value: string }) {
  const t = useT()
  const n = passwordStrength(value)
  const label = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][n]
  const tone = n <= 1 ? 'bg-danger-text' : n === 2 ? 'bg-warning-text' : 'bg-success-text'
  return (
    <div aria-live="polite">
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cx('h-1.5 flex-1 rounded-full', i < n ? tone : 'bg-border-subtle')} />
        ))}
      </div>
      <p className="mt-1 text-small text-ink-700">
        {t('Password strength')}: <span className="font-semibold">{t(label)}</span>
      </p>
    </div>
  )
}

/** H7 Email sign-up */
export function EmailSignup() {
  const { mutate } = useApp()
  const t = useT()
  const nav = useNavigate()
  const [f, setF] = useState({ name: '', email: '', pw: '' })
  const [err, setErr] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  return (
    <Screen>
      <PageHeader title={t('Create your account')} />
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault()
          const er: Record<string, string> = {}
          if (!f.name.trim()) er.name = t('Enter your full name.')
          if (!/^\S+@\S+\.\S+$/.test(f.email)) er.email = t('Enter an email like name@example.com.')
          if (passwordStrength(f.pw) < 2) er.pw = t('Use at least 8 characters with a number.')
          setErr(er)
          if (Object.keys(er).length) return
          setBusy(true)
          await fakeDelay(null)
          mutate((d) => {
            d.session.pendingEmail = f.email
          })
          nav('/auth/verify-email')
        }}
      >
        <Input label={t('Full name')} autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={err.name} />
        <Input label={t('Email')} type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} error={err.email} />
        <Input label={t('Password')} type="password" autoComplete="new-password" value={f.pw} onChange={(e) => setF({ ...f, pw: e.target.value })} error={err.pw} />
        <StrengthMeter value={f.pw} />
        <Button full type="submit" loading={busy} className="mt-2">
          {t('Create account')}
        </Button>
        <Button full variant="tertiary" to="/auth/email/login">
          {t('I already have an account')}
        </Button>
      </form>
    </Screen>
  )
}

/** H8 Email login */
export function EmailLogin() {
  const t = useT()
  const after = useAfterAuth()
  const [f, setF] = useState({ email: '', pw: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Screen>
      <PageHeader title={t('Sign in with email')} />
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!f.email || !f.pw) return setErr(t('Enter your email and password.'))
          setBusy(true)
          await fakeDelay(null)
          setBusy(false)
          after()
        }}
      >
        <Input label={t('Email')} type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <Input label={t('Password')} type="password" autoComplete="current-password" value={f.pw} onChange={(e) => setF({ ...f, pw: e.target.value })} error={err} />
        <Button variant="tertiary" to="/auth/forgot" className="self-start" type="button">
          {t('Forgot password?')}
        </Button>
        <Button full type="submit" loading={busy}>
          {t('Sign in')}
        </Button>
      </form>
    </Screen>
  )
}

/** H9 Forgot password: enter email -> link sent -> set new password */
export function Forgot() {
  const t = useT()
  const nav = useNavigate()
  const [step, setStep] = useState<'email' | 'sent' | 'new'>('email')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const { toast } = useApp()
  return (
    <Screen>
      <PageHeader title={t('Reset your password')} />
      {step === 'email' && (
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            await fakeDelay(null)
            setBusy(false)
            setStep('sent')
          }}
        >
          <Input label={t('Email')} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button full type="submit" loading={busy}>
            {t('Send reset link')}
          </Button>
        </form>
      )}
      {step === 'sent' && (
        <Stack gap={4}>
          <Note tone="success" icon={MailCheck}>
            {t('We sent a link to {email}. It works for 30 minutes.', { email: email || 'your email' })}
          </Note>
          <Button full onClick={() => setStep('new')}>
            {t('Open the link (demo)')}
          </Button>
        </Stack>
      )}
      {step === 'new' && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            toast(t('Password changed'))
            nav('/auth/email/login')
          }}
        >
          <Input label={t('New password')} type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <StrengthMeter value={pw} />
          <Button full type="submit" disabled={passwordStrength(pw) < 2}>
            {t('Save new password')}
          </Button>
        </form>
      )}
    </Screen>
  )
}

/** H10 Verify email: waiting, resend, open mail app */
export function VerifyEmail() {
  const { s, toast } = useApp()
  const t = useT()
  const after = useAfterAuth()
  return (
    <Screen className="flex min-h-dvh flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <span className="grid size-20 place-items-center rounded-full bg-primary-50 text-primary-600">
          <Mail className="size-10" strokeWidth={1.75} aria-hidden />
        </span>
        <h1 className="text-h1 font-semibold">{t('Check your email')}</h1>
        <p className="max-w-sm text-body text-ink-700">{t('We sent a link to {email}. Tap it to finish signing up.', { email: s.session.pendingEmail ?? 'your email' })}</p>
        <p className="flex items-center gap-2 text-small text-ink-700">
          <span className="skeleton inline-block size-2 rounded-full bg-primary-600" aria-hidden /> {t('Waiting for you to tap the link')}
        </p>
      </div>
      <Stack gap={2}>
        <Button full onClick={after}>
          {t('I tapped the link (demo)')}
        </Button>
        <Button full variant="secondary" onClick={() => (window.location.href = 'mailto:')}>
          {t('Open mail app')}
        </Button>
        <Button full variant="tertiary" onClick={() => toast(t('Link sent again'))}>
          {t('Resend link')}
        </Button>
      </Stack>
    </Screen>
  )
}

/** H16 App lock: biometric or PIN. Rendered as an overlay so unsaved input underneath is kept. */
export function LockScreen({ overlay }: { overlay?: boolean }) {
  const { s, mutate } = useApp()
  const t = useT()
  const nav = useNavigate()
  const loc = useLocation()
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const unlock = () => {
    mutate((d) => {
      d.session.locked = false
    })
    if (!overlay) nav((loc.state as { to?: string } | null)?.to ?? '/home', { replace: true })
  }
  const press = (k: string) => {
    if (k === 'del') return setPin(pin.slice(0, -1))
    const next = (pin + k).slice(0, 4)
    setPin(next)
    setErr('')
    if (next.length === 4) {
      if (next === s.account.pin) unlock()
      else {
        setErr(t('Wrong PIN. Try again.'))
        setPin('')
      }
    }
  }
  return (
    <div className={cx('flex flex-col items-center justify-center gap-6 bg-page px-6 py-8', overlay ? 'fixed inset-0 z-[70]' : 'min-h-dvh')} role={overlay ? 'dialog' : undefined} aria-modal={overlay || undefined} aria-label={t('App locked')}>
      <LogoDraw size={56} />
      <h1 className="text-h1 font-semibold">{t('Unlock MedGuard')}</h1>
      <p className="text-small text-ink-700">{t('Demo PIN: 1234')}</p>
      <div className="flex gap-3" aria-label={t('{n} of 4 digits entered', { n: pin.length })}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cx('size-4 rounded-full border-2', i < pin.length ? 'border-primary-600 bg-primary-600' : 'border-border-input')} />
        ))}
      </div>
      {err && (
        <p className="text-small text-danger-text" role="alert">
          {err}
        </p>
      )}
      <div className="grid w-full max-w-72 grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
          <button key={k} type="button" onClick={() => press(k)} className="btn h-16 rounded-card border border-border-subtle bg-surface text-h1 font-semibold tabular hover:bg-primary-50">
            {k}
          </button>
        ))}
        {s.settings.biometric ? (
          <button type="button" onClick={unlock} aria-label={t('Use fingerprint')} className="btn grid h-16 place-items-center rounded-card text-primary-600 hover:bg-primary-50">
            <Fingerprint className="size-8" strokeWidth={1.75} />
          </button>
        ) : (
          <span />
        )}
        <button type="button" onClick={() => press('0')} className="btn h-16 rounded-card border border-border-subtle bg-surface text-h1 font-semibold hover:bg-primary-50">
          0
        </button>
        <button type="button" onClick={() => press('del')} aria-label={t('Delete digit')} className="btn grid h-16 place-items-center rounded-card hover:bg-primary-50">
          <Delete className="size-7" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  )
}
