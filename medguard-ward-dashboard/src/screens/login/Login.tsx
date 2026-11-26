// D1 Login: phone → OTP (mock 123456) → PIN (mock 1234).
import { ArrowLeft, Info, ServerOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Field } from '../../components/Field';
import { LangToggle } from '../../components/LangToggle';
import { Spinner } from '../../components/Spinner';
import { mockFetch } from '../../mock/api';
import { MOCK_OTP, MOCK_PIN, isValidPhone, maskPhone, normalisePhone, roleForPhone } from '../../mock/auth';
import { WARDS } from '../../mock/data';
import type { Role } from '../../mock/types';
import { useStore, useT } from '../../state/store';
import { AuthLayout } from './AuthLayout';

type Stage = 'phone' | 'otp' | 'pin';
const RESEND_SECONDS = 30;

/** Where to go after signing in. */
export function homeFor(role: Role, from?: string) {
  if (role === 'desk') return '/queue';
  if (WARDS.length > 1) return from ? `/ward?next=${encodeURIComponent(from)}` : '/ward';
  return from ?? '/';
}

export function Login() {
  const { session, role, serverDown, dispatch, toast } = useStore();
  const t = useT();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;

  const [signedInOnOpen] = useState(session !== 'out');
  const [stage, setStage] = useState<Stage>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  // Already signed in when this page opened (for example, Back after logging in): go to your start page.
  // Checked only on first render, so it can't race the navigation that a successful login starts.
  if (signedInOnOpen) return <Navigate to={role === 'desk' ? '/queue' : '/'} replace />;

  const cleanPhone = normalisePhone(phone);

  /** Runs a mock server call; shows the server error if the Dev panel says it is down. */
  const call = async (check: () => string | null, next: () => void) => {
    setError('');
    setBusy(true);
    try {
      await mockFetch(null, { serverDown, delay: 500 });
      const problem = check();
      if (problem) setError(problem);
      else next();
    } catch {
      setError(t('login.server'));
    } finally {
      setBusy(false);
    }
  };

  const submitPhone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPhone(cleanPhone)) return setError(t('login.phone.invalid'));
    call(
      () => (roleForPhone(cleanPhone) ? null : t('login.phone.unknown')),
      () => { setStage('otp'); setOtp(''); setResendIn(RESEND_SECONDS); },
    );
  };

  const submitOtp = (e: React.FormEvent) => {
    e.preventDefault();
    call(
      () => (otp === MOCK_OTP ? null : t('login.otp.invalid')),
      () => { setStage('pin'); setPin(''); },
    );
  };

  const submitPin = (e: React.FormEvent) => {
    e.preventDefault();
    call(
      () => (pin === MOCK_PIN ? null : t('login.pin.invalid')),
      () => {
        const role = roleForPhone(cleanPhone)!;
        dispatch({ type: 'login', role });
        navigate(homeFor(role, from), { replace: true });
      },
    );
  };

  const back = (to: Stage) => { setError(''); setStage(to); };
  const stepNo = { phone: 1, otp: 2, pin: 3 }[stage];

  return (
    <AuthLayout aside={<LangToggle />}>
      <p className="text-sm font-semibold text-ink-700 tabular-nums">{t('login.step', { n: stepNo })}</p>

      {stage === 'phone' && (
        <form onSubmit={submitPhone} noValidate className="mt-2 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">{t('login.phone.title')}</h1>
            <p className="mt-1 text-ink-700">{t('login.subtitle')}</p>
          </div>
          <Field
            label={t('login.phone.label')}
            help={t('login.phone.help')}
            error={error}
            prefix="+88"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setError(''); }}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            autoFocus
            className="tabular-nums"
          />
          <button type="submit" disabled={busy} className="btn-primary h-12 w-full">
            {busy && <Spinner />} {t('login.phone.send')}
          </button>
        </form>
      )}

      {stage === 'otp' && (
        <form onSubmit={submitOtp} noValidate className="mt-2 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">{t('login.otp.title')}</h1>
            <p className="mt-1 text-ink-700">{t('login.otp.sent', { phone: maskPhone(cleanPhone) })}</p>
          </div>
          <Field
            label={t('login.otp.label')}
            error={error}
            value={otp}
            onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            className="text-2xl tracking-[0.5em] tabular-nums"
          />
          <button type="submit" disabled={busy || otp.length !== 6} className="btn-primary h-12 w-full">
            {busy && <Spinner />} {t('login.otp.verify')}
          </button>
          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={() => back('phone')} className="inline-flex h-10 items-center gap-1 font-semibold text-primary-600 hover:underline">
              <ArrowLeft size={16} aria-hidden /> {t('login.otp.change')}
            </button>
            {resendIn > 0 ? (
              <span className="text-ink-500 tabular-nums">{t('login.otp.resendIn', { s: resendIn })}</span>
            ) : (
              <button
                type="button"
                onClick={() => { setResendIn(RESEND_SECONDS); setOtp(''); setError(''); toast(t('login.otp.resent')); }}
                className="h-10 font-semibold text-primary-600 hover:underline"
              >
                {t('login.otp.resend')}
              </button>
            )}
          </div>
        </form>
      )}

      {stage === 'pin' && (
        <form onSubmit={submitPin} noValidate className="mt-2 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">{t('login.pin.title')}</h1>
            <p className="mt-1 text-ink-700">{t('login.pin.body')}</p>
          </div>
          <Field
            label={t('login.pin.label')}
            error={error}
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            autoFocus
            className="text-2xl tracking-[0.5em]"
          />
          <button type="submit" disabled={busy || pin.length !== 4} className="btn-primary h-12 w-full">
            {busy && <Spinner />} {t('login.pin.submit')}
          </button>
          <button type="button" onClick={() => back('otp')} className="inline-flex h-10 items-center gap-1 text-sm font-semibold text-primary-600 hover:underline">
            <ArrowLeft size={16} aria-hidden /> {t('login.back')}
          </button>
        </form>
      )}

      {serverDown && (
        <p role="status" className="mt-6 flex items-center gap-2 rounded-control border border-warning-border bg-warning-bg p-3 text-sm font-semibold text-warning-text">
          <ServerOff size={16} aria-hidden className="shrink-0" /> {t('server.banner')}
        </p>
      )}

      {/* Demo values, so testers can sign in. Only in npm run dev, never in the real build. */}
      {import.meta.env.DEV && <div className="mt-6 flex gap-2 rounded-control border border-primary-100 bg-primary-50 p-3 text-sm text-ink-700">
        <Info size={16} aria-hidden className="mt-1 shrink-0 text-primary-600" />
        <div>
          <p className="font-semibold text-primary-700">{t('login.demo')}</p>
          <p className="tabular-nums">{t('login.demoPhones')}</p>
          <p className="tabular-nums">{t('login.demoCodes', { otp: MOCK_OTP, pin: MOCK_PIN })}</p>
        </div>
      </div>}
    </AuthLayout>
  );
}
