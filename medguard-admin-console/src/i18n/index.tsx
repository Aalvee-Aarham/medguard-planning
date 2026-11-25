import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import en from './en.json'
import bn from './bn.json'

type Language = 'en' | 'bn'
type Values = Record<string, string | number>
type Dictionary = Record<string, string>

const catalogs: Record<Language, Dictionary> = { en, bn }
const storageKey = 'medguard-admin-console.language'

interface I18n {
  language: Language
  setLanguage: (value: Language) => void
  t: (key: string, values?: Values) => string
  date: (value: string, withTime?: boolean) => string
}

const I18nContext = createContext<I18n | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    try { return localStorage.getItem(storageKey) === 'bn' ? 'bn' : 'en' }
    catch { return 'en' }
  })

  useEffect(() => {
    document.documentElement.lang = language
    document.title = language === 'bn' ? 'মেডগার্ড অ্যাডমিন কনসোল' : 'MedGuard Admin Console'
    try { localStorage.setItem(storageKey, language) }
    catch { /* The current browser tab still uses the selected language. */ }
  }, [language])

  function t(key: string, values?: Values) {
    const phrase = catalogs[language][key] ?? key
    return values ? phrase.replace(/\{(\w+)\}/g, (match, name: string) => String(values[name] ?? match)) : phrase
  }

  function date(value: string, withTime = false) {
    if (!value) return t('—')
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    const formatted = new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD-u-nu-latn' : 'en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka',
    }).format(parsed)
    if (!withTime) return formatted
    const time = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka',
    }).format(parsed)
    return `${formatted}, ${time}`
  }

  return <I18nContext.Provider value={{ language, setLanguage, t, date }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside I18nProvider')
  return value
}
