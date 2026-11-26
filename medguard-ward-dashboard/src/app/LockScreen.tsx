// Session locked (safety rule 15): covers the whole page so patient data is hidden on a shared PC.
// The page underneath stays mounted, so anything typed before the lock is kept.
import { Lock, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Field } from '../components/Field';
import { LangToggle } from '../components/LangToggle';
import { IDLE_LOCK_MS, MOCK_PIN, QUICK_LOCK_MS } from '../mock/auth';
import { useStore, useT } from '../state/store';

export function LockScreen() {
  const { user, role, lockReason, quickLock, dispatch } = useStore();
  const t = useT();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  // Put focus back where it was once unlocked. (The page underneath is made inert in App while locked.)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    return () => prev?.focus?.();
  }, []);

  const idleTime = quickLock ? t('time.s', { n: QUICK_LOCK_MS / 1000 }) : t('time.min', { n: IDLE_LOCK_MS / 60_000 });
  const initials = user.name.split(' ').map((p) => p[0]).join('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin !== MOCK_PIN) {
      setError(t('login.pin.invalid'));
      setPin('');
      return;
    }
    dispatch({ type: 'unlock' });
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="lock-title" className="fixed inset-0 z-[55] flex flex-col bg-page">
      <div className="flex h-16 items-center justify-end border-b border-border-subtle bg-surface px-8">
        <LangToggle />
      </div>
      <div className="flex flex-1 items-start justify-center px-8 py-16">
        <form onSubmit={submit} noValidate className="w-full max-w-md rounded-card border border-border-subtle bg-surface p-8">
          <div className="flex items-center gap-3">
            <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-lg font-semibold text-primary-700">{initials}</span>
            <div>
              <div className="text-lg font-semibold">{user.name}</div>
              <div className="text-sm text-ink-700">{t(`role.${role}`)}</div>
            </div>
          </div>

          <h1 id="lock-title" className="mt-6 flex items-center gap-2 text-2xl font-semibold">
            <Lock size={24} strokeWidth={1.75} aria-hidden className="text-primary-600" /> {t('lock.title')}
          </h1>
          <p className="mt-1 text-ink-700">{lockReason === 'idle' ? t('lock.idle', { time: idleTime }) : t('lock.manual')}</p>

          <div className="mt-6">
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
          </div>
          <button type="submit" disabled={pin.length !== 4} className="btn-primary mt-6 h-12 w-full">{t('lock.unlock')}</button>
          <button type="button" onClick={() => dispatch({ type: 'logout' })} className="mt-4 inline-flex h-10 items-center gap-2 text-sm font-semibold text-primary-600 hover:underline">
            <LogOut size={16} aria-hidden /> {t('lock.notYou', { name: user.name })}
          </button>
        </form>
      </div>
    </div>
  );
}
