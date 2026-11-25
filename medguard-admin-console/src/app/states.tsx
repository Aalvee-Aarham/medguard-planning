import { useState } from 'react';
import type { FormEvent } from 'react';
import { LockKeyhole, RefreshCw, WifiOff, Wrench } from 'lucide-react';
import { Button, EmptyState, Field, Modal, Notice, Skeleton } from '../components';
import { useI18n } from '../i18n';
import { useDemo } from '../dev/DemoContext';
import { DEMO_AUTHENTICATOR, useSession } from './session';

export function OfflineBanner() {
  const { offline } = useDemo();
  const { t } = useI18n();
  return offline && (
    <div className="admin-offline" role="status">
      <WifiOff size={18} aria-hidden="true" />
      {t('Offline. Demo changes are saved on this device.')}
    </div>
  );
}

export function DemoPageState() {
  const { pageState, setPageState } = useDemo();
  const { t } = useI18n();
  if (pageState === 'loading') return <Skeleton label={t('Loading screen')} />;
  if (pageState !== 'error') return null;
  return (
    <EmptyState
      title={t('This screen could not load')}
      description={t('Retry to load the screen again.')}
      action={<Button type="button" onClick={() => setPageState('ready')}>{t('Retry')}</Button>}
    />
  );
}

function LockedSession() {
  const { t } = useI18n();
  const { user, unlock } = useSession();
  const [code, setCode] = useState('');
  const [invalid, setInvalid] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code === DEMO_AUTHENTICATOR) unlock();
    else setInvalid(true);
  }

  return (
    <Modal title={t('Session locked')}>
      <form className="stack" onSubmit={submit} noValidate>
        <p className="admin-state-line"><LockKeyhole size={20} aria-hidden="true" />{t('Enter your authenticator code to continue as {name}.', { name: user?.name ?? '' })}</p>
        <Field label={t('Six-digit code')} error={invalid ? t('Enter the six-digit authenticator code shown below.') : undefined}>
          <input
            autoComplete="one-time-code"
            autoFocus
            inputMode="numeric"
            value={code}
            onChange={(event) => { setCode(event.target.value.replace(/\D/g, '').slice(0, 6)); setInvalid(false); }}
          />
        </Field>
        <Notice>{t('Demo code')} <strong className="admin-code">{DEMO_AUTHENTICATOR}</strong></Notice>
        <div className="actions"><Button type="submit">{t('Unlock session')}</Button></div>
      </form>
    </Modal>
  );
}

export function SystemStateDialogs() {
  const { locked } = useSession();
  const demo = useDemo();
  const { t } = useI18n();
  if (locked) return <LockedSession />;
  if (demo.forcedUpdate) {
    return (
      <Modal title={t('Update required')}>
        <div className="stack">
          <p className="admin-state-line"><RefreshCw size={20} aria-hidden="true" />{t('Apply the latest version to continue.')}</p>
          <Button type="button" onClick={() => demo.setForcedUpdate(false)}>{t('Apply update')}</Button>
        </div>
      </Modal>
    );
  }
  if (demo.maintenance) {
    return (
      <Modal title={t('Maintenance in progress')}>
        <div className="stack">
          <p className="admin-state-line"><Wrench size={20} aria-hidden="true" />{t('The console is temporarily unavailable.')}</p>
          <Button type="button" onClick={() => demo.setMaintenance(false)}>{t('Check again')}</Button>
        </div>
      </Modal>
    );
  }
  return null;
}
