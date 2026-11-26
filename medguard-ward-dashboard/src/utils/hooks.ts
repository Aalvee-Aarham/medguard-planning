import { useCallback, useEffect, useState } from 'react';
import { mockFetch } from '../mock/api';
import { useStore, useT } from '../state/store';
import { since } from './format';

/** Current time, refreshed every `ms`, so "time in status" keeps counting up. */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(timer);
  }, [ms]);
  return now;
}

/** Returns a function that turns an ISO time into "12 min", "3 h" or "2 d" in the current language. */
export function useAgo() {
  const t = useT();
  const now = useNow();
  return useCallback((iso: string) => {
    const { n, unit } = since(iso, now);
    return t(`time.${unit}`, { n });
  }, [t, now]);
}

/** Turns seconds into "48 s" or "4 min 10 s" in the current language. */
export function useDuration() {
  const t = useT();
  return useCallback((secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    return m ? t('dur.ms', { m, s }) : t('dur.s', { s });
  }, [t]);
}

/**
 * Simulates a screen's first load from the server: skeleton, then content, or the error state
 * when "Force errors" is on in the Dev panel. Live data itself comes from the store.
 * A server outage does not fail the load: the screen shows the last data with the banner.
 */
export function useMockLoad() {
  const { forceErrors } = useStore();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    mockFetch(null, { forceError: forceErrors, delay: 400 })
      .then(() => alive && setStatus('ready'))
      .catch(() => alive && setStatus('error'));
    return () => { alive = false; };
    // Only reload on Retry, not every time the Dev switch changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  return { loading: status === 'loading', error: status === 'error', retry: () => setAttempt((a) => a + 1) };
}
