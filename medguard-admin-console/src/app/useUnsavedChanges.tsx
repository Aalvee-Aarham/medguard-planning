import { useCallback } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router-dom';
import { Button, Modal } from '../components/ui';
import { useI18n } from '../i18n';

export function UnsavedChanges({ dirty }: { dirty: boolean }) {
  const { t } = useI18n();
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => dirty && (
      currentLocation.pathname !== nextLocation.pathname ||
      currentLocation.search !== nextLocation.search
    ),
  );

  useBeforeUnload(useCallback((event) => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = '';
  }, [dirty]));

  if (blocker.state !== 'blocked') return null;

  return (
    <Modal title={t('Discard unsaved changes?')} onClose={blocker.reset}>
      <div className="stack">
        <p>{t('Your changes on this page will be lost if you leave.')}</p>
        <div className="actions">
          <Button type="button" variant="secondary" onClick={blocker.reset}>{t('Keep editing')}</Button>
          <Button type="button" variant="danger" onClick={blocker.proceed}>{t('Discard changes')}</Button>
        </div>
      </div>
    </Modal>
  );
}
