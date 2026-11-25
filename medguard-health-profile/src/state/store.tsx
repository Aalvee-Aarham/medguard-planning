import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { makeSeed, SELF } from '../mock/seed'
import type { Profile, Role, Settings, UploadBatch } from '../mock/types'

const KEY = 'medguard-hp-v1'

export const LIMITS = {
  free: { profiles: 2, chats: 20, searches: 3, storageMb: 500 },
  premium: { profiles: 8, chats: Infinity, searches: Infinity, storageMb: 10240 },
}

export interface Session {
  signedIn: boolean
  locked: boolean
  pendingPhone?: string
  pendingEmail?: string
  accountType?: 'personal' | 'doctor'
  unsaved?: Record<string, string>
}

export interface Dev {
  offline: boolean
  forceErrors: boolean
  roleOverride?: Role
  forcedUpdate: boolean
  maintenance: boolean
}

export interface AppState extends ReturnType<typeof makeSeed> {
  activeProfileId: string
  settings: Settings
  session: Session
  dev: Dev
  batches: UploadBatch[]
  savedCases: Record<string, string[]>
  usage: { chats: number; searches: number }
  queue: { id: string; label: string }[]
  dismissedPrompts: string[]
}

function initial(): AppState {
  return {
    ...makeSeed(),
    activeProfileId: SELF,
    settings: {
      lang: 'en', textSize: 1, biometric: false, autoLockMin: 5, consents: {},
      notif: { reminders: true, missed: true, processed: true, hospital: true, queue: true, invites: true, subscription: true },
      similarAccepted: false, onboarded: false,
    },
    session: { signedIn: false, locked: false },
    dev: { offline: false, forceErrors: false, forcedUpdate: false, maintenance: false },
    batches: [],
    savedCases: {},
    usage: { chats: 13, searches: 2 },
    queue: [],
    dismissedPrompts: [],
  }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...initial(), ...JSON.parse(raw) }
  } catch {
    /* corrupt storage: start fresh */
  }
  return initial()
}

interface Ctx {
  s: AppState
  mutate: (fn: (d: AppState) => void) => void
  reset: () => void
  online: boolean
  justSynced: boolean
  profile: Profile
  role: Role
  can: (action: Action) => boolean
  toast: (msg: string) => void
  toastMsg: string | null
  limitHit: null | 'chats' | 'searches' | 'profiles'
  setLimitHit: (v: null | 'chats' | 'searches' | 'profiles') => void
  /** queue an action while offline; returns true if queued */
  queueIfOffline: (label: string) => boolean
}

export type Action = 'upload' | 'edit' | 'delete' | 'share' | 'caregivers' | 'urgent' | 'deleteAccount'

const PERMS: Record<Role, Action[]> = {
  owner: ['upload', 'edit', 'delete', 'share', 'caregivers', 'urgent', 'deleteAccount'],
  'caregiver-manage': ['upload', 'edit', 'delete', 'share', 'urgent'],
  'caregiver-view': [],
  doctor: ['upload'],
}

const AppCtx = createContext<Ctx | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<AppState>(load)
  const [netOnline, setNetOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const [justSynced, setJustSynced] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [limitHit, setLimitHit] = useState<null | 'chats' | 'searches' | 'profiles'>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(s))
  }, [s])

  useEffect(() => {
    const on = () => setNetOnline(true)
    const off = () => setNetOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const online = netOnline && !s.dev.offline

  // Coming back online: flush the queue, show "All synced" for 3 s
  const wasOnline = useRef(online)
  useEffect(() => {
    if (online && !wasOnline.current) {
      setS((p) => ({ ...p, queue: [] }))
      setJustSynced(true)
      const t = window.setTimeout(() => setJustSynced(false), 3000)
      wasOnline.current = online
      return () => window.clearTimeout(t)
    }
    wasOnline.current = online
  }, [online])

  // Language + text size on <html>
  useEffect(() => {
    document.documentElement.lang = s.settings.lang
    document.documentElement.style.setProperty('--ts', String(s.settings.textSize))
  }, [s.settings.lang, s.settings.textSize])

  const mutate = useCallback((fn: (d: AppState) => void) => {
    setS((prev) => {
      const draft = structuredClone(prev)
      fn(draft)
      return draft
    })
  }, [])

  const reset = useCallback(() => {
    const fresh = initial()
    setS((prev) => ({ ...fresh, settings: { ...fresh.settings, lang: prev.settings.lang, onboarded: true, consents: prev.settings.consents }, session: { signedIn: true, locked: false } }))
  }, [])

  const toast = useCallback((msg: string) => {
    window.clearTimeout(toastTimer.current)
    setToastMsg(msg)
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 4000)
  }, [])

  const profile = s.profiles.find((p) => p.id === s.activeProfileId) ?? s.profiles[0]
  const role: Role = s.dev.roleOverride ?? profile.role

  const can = useCallback((a: Action) => PERMS[role].includes(a), [role])

  const queueIfOffline = useCallback(
    (label: string) => {
      if (online) return false
      setS((p) => ({ ...p, queue: [...p.queue, { id: crypto.randomUUID(), label }] }))
      return true
    },
    [online],
  )

  const value = useMemo<Ctx>(
    () => ({ s, mutate, reset, online, justSynced, profile, role, can, toast, toastMsg, limitHit, setLimitHit, queueIfOffline }),
    [s, mutate, reset, online, justSynced, profile, role, can, toast, toastMsg, limitHit, queueIfOffline],
  )
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp() {
  const c = useContext(AppCtx)
  if (!c) throw new Error('useApp outside AppProvider')
  return c
}

export const uid = (p = 'id') => `${p}-${Math.random().toString(36).slice(2, 9)}`
