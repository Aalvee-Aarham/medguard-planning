import { useEffect } from 'react';
import { IDLE_LOCK_MS, QUICK_LOCK_MS } from '../mock/auth';
import { useStore } from '../state/store';

const ACTIVITY = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;

/** Locks the session after a period with no mouse or keyboard activity. */
export function useIdleLock() {
  const { session, quickLock, dispatch } = useStore();
  const active = session === 'in';
  const ms = quickLock ? QUICK_LOCK_MS : IDLE_LOCK_MS;

  useEffect(() => {
    if (!active) return;
    let timer = setTimeout(() => dispatch({ type: 'lock', reason: 'idle' }), ms);
    const restart = () => {
      clearTimeout(timer);
      timer = setTimeout(() => dispatch({ type: 'lock', reason: 'idle' }), ms);
    };
    ACTIVITY.forEach((e) => window.addEventListener(e, restart, { passive: true, capture: true }));
    return () => {
      clearTimeout(timer);
      ACTIVITY.forEach((e) => window.removeEventListener(e, restart, { capture: true }));
    };
  }, [active, ms, dispatch]);
}
