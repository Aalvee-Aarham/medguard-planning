import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, Building2, Check, Server, ShieldCheck, ShieldPlus } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useMock } from '../mock/store';
import { Button, Field, Notice } from '../components';
import { useLoginMotion } from './motion';
import { DEMO_AUTHENTICATOR, DEMO_OTP, demoUsers, loginPath, useSession } from './session';
import type { Area, DemoUser } from './session';
import { OfflineBanner } from './states';

type Stage = 'account' | 'otp' | 'authenticator';

function normalizeContact(value: string) {
  const contact = value.trim().toLowerCase();
  return contact.includes('@') ? contact : contact.replace(/[+\s()-]/g, '').replace(/^880(?=1\d{9}$)/, '0');
}

export function Brand() {
  const { t } = useI18n();
  return (
    <span className="admin-brand">
      <span className="admin-brand-icon"><ShieldPlus size={22} strokeWidth={1.75} aria-hidden="true" /></span>
      <span><strong>{t('MedGuard')}</strong><small>{t('Admin Console')}</small></span>
    </span>
  );
}

export function LanguageSwitch() {
  const { language, setLanguage, t } = useI18n();
  return (
    <div className="admin-languages" role="group" aria-label={t('Language')}>
      <button type="button" aria-pressed={language === 'en'} lang="en" onClick={() => setLanguage('en')}>English</button>
      <button type="button" aria-pressed={language === 'bn'} lang="bn" onClick={() => setLanguage('bn')}>বাংলা</button>
    </div>
  );
}

export function Login({ area }: { area: Area }) {
  const { t } = useI18n();
  const { db } = useMock();
  const { user, signIn } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const scope = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('account');
  const [contact, setContact] = useState('');
  const [candidate, setCandidate] = useState<DemoUser>();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const hospital = area === 'hospital';
  const defaultDemo = demoUsers.find((account) => account.area === area)!;
  const currentStep = { account: 1, otp: 2, authenticator: 3 }[stage];
  const accessStep = stage !== 'account';
  const redirect = location.state?.returnTo as unknown;
  const destination = typeof redirect === 'string' && redirect.startsWith('/' + area + '/') && !['/medguard/login', '/medguard/logout', '/hospital/logout'].includes(redirect)
    ? redirect
    : '/' + area;
  useLoginMotion(scope, stage);

  if (user?.area === area) return <Navigate to={destination} replace />;

  function advance(nextStage: Stage) {
    setError('');
    setCode('');
    setStage(nextStage);
  }

  function fail(message: string) {
    setError(message);
    input.current?.focus();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (stage === 'account') {
      const normalized = normalizeContact(contact);
      if (!normalized) {
        fail('Enter your phone number or email address.');
        return;
      }
      const demo = demoUsers.find((account) => account.area === area && (
        normalizeContact(account.contact) === normalized ||
        (account.phone && normalizeContact(account.phone) === normalized)
      ));
      const onboarded = hospital
        ? db.hospitals.find((record) => record.adminContact && normalizeContact(record.adminContact) === normalized)
        : undefined;
      if (demo) setCandidate(demo);
      else if (onboarded?.adminName && onboarded.adminContact) {
        setCandidate({
          id: 'admin:' + onboarded.id,
          area,
          name: onboarded.adminName,
          contact: onboarded.adminContact,
          hospitalId: onboarded.id,
        });
      } else {
        fail('Use an account for this area. You can fill in the demo account below.');
        return;
      }
      advance('otp');
      return;
    }
    if (stage === 'otp') {
      if (code !== DEMO_OTP) {
        fail('Enter the six-digit verification code shown below.');
        return;
      }
      advance('authenticator');
      return;
    }
    if (code !== DEMO_AUTHENTICATOR) {
      fail('Enter the six-digit authenticator code shown below.');
      return;
    }
    if (candidate) {
      signIn(candidate);
      void navigate(destination, { replace: true });
    }
  }

  const title = stage === 'account'
    ? 'Sign in'
    : stage === 'otp' ? 'Verify your contact' : 'Enter your authenticator code';

  return (
    <div className="admin-login" ref={scope}>
      <header className="admin-login-header"><Brand /><LanguageSwitch /></header>
      <OfflineBanner />
      <main className="admin-login-main">
        <section className="admin-login-intro" aria-labelledby="admin-login-area">
          <div className="admin-login-symbol" data-login-parallax>
            {hospital ? <Building2 size={40} strokeWidth={1.5} aria-hidden="true" /> : <Server size={40} strokeWidth={1.5} aria-hidden="true" />}
          </div>
          <h1 id="admin-login-area">{t(hospital ? 'Hospital administration' : 'MedGuard operations')}</h1>
          <p>{t(hospital ? 'Manage your hospital’s staff, beds and ward rules.' : 'Onboard hospitals and manage cameras, devices and support.')}</p>
          <div className="admin-login-security"><ShieldCheck size={20} aria-hidden="true" />{t('Two-step verification')}</div>
        </section>
        <section className="admin-login-card" aria-labelledby="admin-login-title">
          <div className="admin-login-progress" role="progressbar" aria-valuemin={1} aria-valuemax={3}
            aria-valuenow={currentStep} aria-label={t('Sign-in progress')} aria-valuetext={t('Step {current} of {total}', { current: currentStep, total: 3 })}>
            {[1, 2, 3].map((step) => <span key={step} className={step <= currentStep ? 'complete' : ''} aria-hidden="true" />)}
          </div>
          <div className="admin-login-step" key={stage}>
            <h2 id="admin-login-title">{t(title)}</h2>
            <p className="muted">
              {stage === 'account' && t('Use your phone number or email to continue.')}
              {stage === 'otp' && t('Enter the verification code for {contact}.', { contact: contact.trim() })}
              {stage === 'authenticator' && t('Enter the code from your authenticator app.')}
            </p>
            <form className="stack" onSubmit={submit} noValidate>
              <Field label={t(accessStep ? 'Six-digit code' : 'Phone number or email')} htmlFor="login-value" error={error ? t(error) : undefined}>
                <input
                  id="login-value"
                  ref={input}
                  autoFocus={accessStep}
                  autoComplete={stage === 'account' ? 'username' : 'one-time-code'}
                  inputMode={accessStep ? 'numeric' : 'text'}
                  value={accessStep ? code : contact}
                  onChange={(event) => {
                    if (accessStep) setCode(event.target.value.replace(/\D/g, '').slice(0, 6));
                    else setContact(event.target.value);
                    setError('');
                  }}
                />
              </Field>
              <Button type="submit">
                {t(stage === 'account' ? 'Send code' : stage === 'otp' ? 'Verify code' : 'Sign in')}
              </Button>
            </form>
            {stage === 'account' ? (
              <div className="admin-demo-account">
                <span><strong>{t('Demo account')}</strong><small>{defaultDemo.contact}</small></span>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { setContact(defaultDemo.contact); setError(''); input.current?.focus(); }}
                >{t('Use demo account')}</Button>
              </div>
            ) : (
              <div className="admin-login-help">
                <Notice>{t('Demo code')} <strong className="admin-code">{stage === 'otp' ? DEMO_OTP : DEMO_AUTHENTICATOR}</strong></Notice>
                <Button type="button" variant="ghost" onClick={() => advance(stage === 'otp' ? 'account' : 'otp')}>
                  <ArrowLeft size={16} aria-hidden="true" />{t('Back')}
                </Button>
              </div>
            )}
          </div>
        </section>
        <footer className="admin-login-footer">
          <span><Check size={16} aria-hidden="true" />{t('Demo environment')}</span>
          <Link to={loginPath(hospital ? 'medguard' : 'hospital')}>{t(hospital ? 'MedGuard team sign-in' : 'Hospital admin sign-in')}</Link>
        </footer>
      </main>
    </div>
  );
}
