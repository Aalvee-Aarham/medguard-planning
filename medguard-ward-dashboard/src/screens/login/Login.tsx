// D1 Login: phone → OTP (mock 123456) → PIN (mock 1234).
import { AlertCircle, ArrowLeft, ArrowRight, Info, ServerOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
  const [errorTick, setErrorTick] = useState(0); // bumps on each new error so the field shakes again
  const otpForm = useRef<HTMLFormElement>(null);

  useEffect(() => { if (error) setErrorTick((n) => n + 1); }, [error]);

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
      <div className="mb-1 flex gap-1.5" aria-hidden>
        {[1, 2, 3].map((n) => (
          <span key={n} className="h-1 flex-1 overflow-hidden rounded-full bg-sky-100">
            <span className={`block h-full origin-left bg-sky-500 transition-transform duration-500 ${n <= stepNo ? 'scale-x-100' : 'scale-x-0'}`} />
          </span>
        ))}
      </div>
      <p className="text-sm font-semibold text-ink-700 tabular-nums">{t('login.step', { n: stepNo })}</p>

      {stage === 'phone' && (
        <form key="phone" onSubmit={submitPhone} noValidate className="auth-step-in mt-2 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">{t('login.phone.title')}</h1>
            <p className="mt-1 text-ink-700">{t('login.subtitle')}</p>
          </div>
          <Shake tick={errorTick}><Field
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
          /></Shake>
          <button type="submit" disabled={busy} className="btn-sky">
            {busy ? <Spinner /> : null} {t('login.phone.send')} {!busy && <ArrowRight size={18} aria-hidden />}
          </button>
        </form>
      )}

      {stage === 'otp' && (
        <form key="otp" ref={otpForm} onSubmit={submitOtp} noValidate className="auth-step-in mt-2 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">{t('login.otp.title')}</h1>
            <p className="mt-1 text-ink-700">{t('login.otp.sent', { phone: maskPhone(cleanPhone) })}</p>
          </div>
          <OtpBoxes
            label={t('login.otp.label')}
            value={otp}
            error={error}
            errorTick={errorTick}
            onChange={(v) => {
              setOtp(v);
              setError('');
              // All six typed: check straight away.
              if (v.length === 6 && !busy) setTimeout(() => otpForm.current?.requestSubmit(), 0);
            }}
          />
          <button type="submit" disabled={busy || otp.length !== 6} className="btn-sky">
            {busy && <Spinner />} {t('login.otp.verify')}
          </button>
          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={() => back('phone')} className="inline-flex h-10 items-center gap-1 font-semibold text-sky-700 hover:underline">
              <ArrowLeft size={16} aria-hidden /> {t('login.otp.change')}
            </button>
            {resendIn > 0 ? (
              <span className="text-ink-500 tabular-nums">{t('login.otp.resendIn', { s: resendIn })}</span>
            ) : (
              <button
                type="button"
                onClick={() => { setResendIn(RESEND_SECONDS); setOtp(''); setError(''); toast(t('login.otp.resent')); }}
                className="h-10 font-semibold text-sky-700 hover:underline"
              >
                {t('login.otp.resend')}
              </button>
            )}
          </div>
        </form>
      )}

      {stage === 'pin' && (
        <form key="pin" onSubmit={submitPin} noValidate className="auth-step-in mt-2 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">{t('login.pin.title')}</h1>
            <p className="mt-1 text-ink-700">{t('login.pin.body')}</p>
          </div>
          <div className="flex justify-center gap-4" aria-hidden>
            {[0, 1, 2, 3].map((i) => <span key={i} className={`pin-dot ${i < pin.length ? 'is-on' : ''}`} />)}
          </div>
          <Shake tick={errorTick}><Field
            label={t('login.pin.label')}
            error={error}
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            autoFocus
            className="text-center text-2xl tracking-[0.5em]"
          /></Shake>
          <button type="submit" disabled={busy || pin.length !== 4} className="btn-sky">
            {busy && <Spinner />} {t('login.pin.submit')}
          </button>
          <button type="button" onClick={() => back('otp')} className="inline-flex h-10 items-center gap-1 text-sm font-semibold text-sky-700 hover:underline">
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

/** Six single-digit boxes for the text-message code. Typing moves forward, Backspace moves back, paste fills all. */
function OtpBoxes({ label, value, error, errorTick, onChange }: {
  label: string; value: string; error: string; errorTick: number; onChange: (v: string) => void;
}) {
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  // Latest value, read when focus moves: the next box gets focus before React re-renders with the new digit.
  const latest = useRef(value);
  latest.current = value;
  const emit = (v: string) => { latest.current = v; onChange(v); };
  const focus = (i: number) => boxes.current[Math.max(0, Math.min(5, i))]?.focus();
  useEffect(() => { focus(0); }, []);

  const setAt = (i: number, digit: string) => {
    const chars = latest.current.padEnd(6, ' ').split('');
    chars[i] = digit || ' ';
    emit(chars.join('').replace(/\s+$/, '').replace(/\s/g, ''));
  };

  return (
    <fieldset>
      <legend className="block font-semibold">{label}</legend>
      <Shake tick={errorTick} className="mt-2 flex gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <input
            key={i}
            ref={(el) => { boxes.current[i] = el; }}
            value={value[i] ?? ''}
            aria-label={`${label} ${i + 1}`}
            aria-invalid={!!error}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            onFocus={() => { if (i > latest.current.length) focus(latest.current.length); }}
            className={`otp-box ${value[i] ? 'is-filled' : ''} ${error ? '!border-danger-text' : ''}`}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '');
              if (digits.length > 1) { emit((latest.current.slice(0, i) + digits).slice(0, 6)); focus(i + digits.length); return; }
              setAt(i, digits);
              if (digits) focus(i + 1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !latest.current[i]) { e.preventDefault(); setAt(i - 1, ''); focus(i - 1); }
              if (e.key === 'ArrowLeft') focus(i - 1);
              if (e.key === 'ArrowRight') focus(i + 1);
            }}
            onPaste={(e) => {
              e.preventDefault();
              const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
              if (digits) { emit(digits); focus(digits.length); }
            }}
          />
        ))}
      </Shake>
      {error && (
        <p role="alert" className="mt-1 flex items-center gap-1 text-sm text-danger-text">
          <AlertCircle size={16} aria-hidden className="shrink-0" /> {error}
        </p>
      )}
    </fieldset>
  );
}

/** Gives its content a short side-to-side shake each time `tick` goes up (a new error). Skipped under "reduce motion". */
function Shake({ tick, className, children }: { tick: number; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!tick || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    ref.current?.animate(
      [{ transform: 'none' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }],
      { duration: 350 },
    );
  }, [tick]);
  return <div ref={ref} className={className}>{children}</div>;
}
