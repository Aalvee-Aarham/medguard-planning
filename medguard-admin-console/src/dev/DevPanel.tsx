import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Field, Modal } from '../components';
import { useI18n } from '../i18n';
import { useMock } from '../mock/store';
import { demoUsers, useSession } from '../app/session';
import { useDemo } from './DemoContext';

export function DevPanel({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { user } = useSession();
  const { cameraOffline, setCameraOffline } = useMock();
  const demo = useDemo();
  const navigate = useNavigate();
  const [choice, setChoice] = useState(user?.id ?? '');
  const [resetting, setResetting] = useState(false);

  function switchAccount() {
    if (choice === user?.id) return;
    onClose();
    void navigate('/demo-account/' + choice, { state: { demoSwitch: true } });
  }

  return (
    <Modal title={t('Demo controls')} onClose={onClose}>
      <div className="stack">
        <Field label={t('Demo user')}>
          <select value={choice} onChange={(event) => setChoice(event.target.value)}>
            {!demoUsers.some((account) => account.id === user?.id) && <option value={user?.id}>{user?.name}</option>}
            {demoUsers.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} · {t(account.area === 'hospital' ? 'Hospital admin' : 'MedGuard team')}
              </option>
            ))}
          </select>
        </Field>
        <Button type="button" variant="secondary" onClick={switchAccount} disabled={choice === user?.id}>{t('Switch user')}</Button>
        <Field label={t('Screen state')}>
          <select value={demo.pageState} onChange={(event) => {
            const value = event.target.value;
            if (value === 'ready' || value === 'loading' || value === 'error') demo.setPageState(value);
          }}>
            <option value="ready">{t('Ready')}</option>
            <option value="loading">{t('Loading')}</option>
            <option value="error">{t('Error')}</option>
          </select>
        </Field>
        <label className="check-row">
          <input type="checkbox" checked={cameraOffline} onChange={(event) => setCameraOffline(event.target.checked)} />
          {t('Simulate CAM-02 offline')}
        </label>
        <label className="check-row">
          <input type="checkbox" checked={demo.simulatedOffline} onChange={(event) => demo.setSimulatedOffline(event.target.checked)} />
          {t('Simulate offline')}
        </label>
        <label className="check-row">
          <input type="checkbox" checked={demo.maintenance} onChange={(event) => { demo.setMaintenance(event.target.checked); onClose(); }} />
          {t('Simulate maintenance')}
        </label>
        <label className="check-row">
          <input type="checkbox" checked={demo.forcedUpdate} onChange={(event) => { demo.setForcedUpdate(event.target.checked); onClose(); }} />
          {t('Simulate required update')}
        </label>
        {resetting ? (
          <div className="stack">
            <p>{t('Resetting removes changes made in this demo.')}</p>
            <div className="actions">
              <Button type="button" variant="secondary" onClick={() => setResetting(false)}>{t('Keep demo data')}</Button>
              <Button type="button" variant="danger" onClick={() => {
                onClose();
                void navigate('/demo-account/' + (user?.area === 'medguard' ? 'tania' : 'farhana'), {
                  state: { demoSwitch: true, reset: true },
                });
              }}>{t('Reset demo data')}</Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="ghost" onClick={() => setResetting(true)}>{t('Reset demo data')}</Button>
        )}
      </div>
    </Modal>
  );
}
