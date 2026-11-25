import { useCallback } from 'react'
import bn from './bn.json'
import { useApp } from '../state/store'

const BN = bn as Record<string, string>

const warned = new Set<string>()

export type Vars = Record<string, string | number>

/** English text is the key. bn.json maps it to Bangla. Missing keys fall back to English (npm run i18n lists them). */
export function translate(lang: 'en' | 'bn', key: string, vars?: Vars) {
  if (import.meta.env.DEV && lang === 'bn' && !(key in BN) && !warned.has(key)) {
    warned.add(key)
    console.warn('[i18n] missing bn:', key)
  }
  let out = lang === 'bn' ? (BN[key] ?? key) : key
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v))
  return out
}

export function useT() {
  const { s } = useApp()
  const lang = s.settings.lang
  return useCallback((key: string, vars?: Vars) => translate(lang, key, vars), [lang])
}
