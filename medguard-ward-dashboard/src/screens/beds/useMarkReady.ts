import { useStore, useT } from '../../state/store';

/** Marks a cleaned bed ready: updates the bed, logs it in history and the audit log, and confirms with a toast. */
export function useMarkReady() {
  const { dispatch, user, logAudit, toast, serverDown } = useStore();
  const t = useT();
  const markReady = (bedId: number) => {
    dispatch({ type: 'mark-ready', bedId, at: new Date().toISOString(), by: user.name });
    logAudit(`Bed ${bedId} marked ready`, '');
    toast(t('beds.markedToast', { bed: bedId }));
  };
  // Changes are paused while the hospital server is unreachable.
  return { markReady, disabled: serverDown, disabledReason: serverDown ? t('common.paused') : undefined };
}
