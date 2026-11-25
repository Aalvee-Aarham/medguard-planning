import { useCallback, useEffect, useState } from 'react'
import { useApp } from '../state/store'

/** Fake latency 300–800 ms so skeletons are visible. The Dev panel can force errors. */
export function fakeDelay<T>(value: T, opts: { fail?: boolean } = {}): Promise<T> {
  const ms = 300 + Math.random() * 500
  return new Promise((res, rej) => setTimeout(() => (opts.fail ? rej(new Error('Server did not answer')) : res(value)), ms))
}

export type LoadState = 'loading' | 'error' | 'ok'

/** Simulates fetching the screen's data. The data itself lives in the store; this only drives the states. */
export function useFakeLoad(key: string = '') {
  const { s } = useApp()
  const [state, setState] = useState<LoadState>('loading')
  const [n, setN] = useState(0)
  const fail = s.dev.forceErrors
  useEffect(() => {
    let alive = true
    setState('loading')
    fakeDelay(null, { fail }).then(
      () => alive && setState('ok'),
      () => alive && setState('error'),
    )
    return () => {
      alive = false
    }
  }, [key, n, fail])
  const retry = useCallback(() => setN((x) => x + 1), [])
  return { state, retry }
}
