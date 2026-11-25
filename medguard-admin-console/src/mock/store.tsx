import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { id, initialData } from './data'
import type { Area, Database } from './data'

const storageKey = 'medguard-admin-console.mock.v1'

type Actor = { area: Area; name: string; hospitalId?: string }
type WriteDetails = { patient?: string; reason?: string; hospitalId?: string }
type Write = (action: string, target: string, update: (db: Database) => Database, details?: WriteDetails) => void

interface MockStore {
  db: Database
  write: Write
  reset: () => void
  cameraOffline: boolean
  setCameraOffline: (offline: boolean) => void
  storageError: boolean
}

const MockContext = createContext<MockStore | null>(null)

function readStoredData(): Database | null {
  try {
    const saved = localStorage.getItem(storageKey)
    if (!saved) return null
    const result = JSON.parse(saved) as Database
    return Object.keys(initialData).every((key) => Array.isArray(result?.[key as keyof Database]))
      ? result
      : null
  } catch {
    return null
  }
}

export function MockProvider({ actor, children }: { actor: Actor | null; children: ReactNode }) {
  const [db, setDb] = useState(() => readStoredData() ?? initialData)
  const [cameraOffline, setCameraOffline] = useState(false)
  const [storageError, setStorageError] = useState(false)
  const latest = useRef(db)

  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key !== storageKey && event.key !== null) return
      const next = readStoredData() ?? initialData
      latest.current = next
      setDb(next)
    }

    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  function save(next: Database) {
    latest.current = next
    setDb(next)
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
      setStorageError(false)
    } catch {
      setStorageError(true)
    }
  }

  const write: Write = (action, target, update, details = {}) => {
    if (!actor) return
    const current = (storageError ? null : readStoredData()) ?? latest.current
    const next = update(current)
    const entry = {
      id: id('audit'),
      area: actor.area,
      hospitalId: actor.hospitalId ?? details.hospitalId,
      who: actor.name,
      action,
      target,
      at: new Date().toISOString(),
      patient: actor.area === 'hospital' ? details.patient : undefined,
      reason: details.reason,
    }
    save({ ...next, audit: [entry, ...next.audit] })
  }

  function reset() {
    setCameraOffline(false)
    save(initialData)
  }

  return (
    <MockContext.Provider value={{ db, write, reset, cameraOffline, setCameraOffline, storageError }}>
      {children}
    </MockContext.Provider>
  )
}

export function useMock() {
  const value = useContext(MockContext)
  if (!value) throw new Error('useMock must be used inside MockProvider')
  return value
}
