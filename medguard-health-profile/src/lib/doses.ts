import type { AppState } from '../state/store'
import type { Medicine } from '../mock/types'
import { nextDose } from './format'

export interface Upcoming {
  med: Medicine
  due: Date
  status: 'due' | 'next'
  doseId: string
}

export const doseId = (medId: string, due: Date) => `${medId}@${due.toISOString()}`

/** Next doses for a profile, skipping ones already logged. A dose up to 60 min late is "Due now". */
export function upcoming(s: AppState, profileId: string, now = new Date()): Upcoming[] {
  const out: Upcoming[] = []
  for (const med of s.medicines.filter((m) => m.profileId === profileId && m.current && m.reminder.on)) {
    const cands = med.times
      .flatMap((t) => {
        const [h, m] = t.split(':').map(Number)
        const a = new Date(now)
        a.setHours(h, m, 0, 0)
        return [a, new Date(a.getTime() + 86400000)]
      })
      .filter((d) => d.getTime() > now.getTime() - 60 * 60000)
      .sort((a, b) => a.getTime() - b.getTime())
    const due = cands.find((d) => !s.doseLogs.some((l) => l.medicineId === med.id && l.due === d.toISOString() && l.status !== 'snoozed'))
    if (!due) continue
    // snoozed: shift to snooze time
    const snooze = s.doseLogs.find((l) => l.medicineId === med.id && l.due === due.toISOString() && l.status === 'snoozed')
    const eff = snooze?.at ? new Date(snooze.at) : due
    out.push({ med, due, status: eff.getTime() <= now.getTime() ? 'due' : 'next', doseId: doseId(med.id, due) })
  }
  return out.sort((a, b) => a.due.getTime() - b.due.getTime())
}

export { nextDose }

type Mutate = (fn: (d: AppState) => void) => void

/** Records Taken / Skipped / Snoozed for one dose. Instant: no animation before the state changes. */
export function logDose(mutate: Mutate, med: Medicine, due: Date, status: 'taken' | 'skipped' | 'snoozed', opts: { reason?: string; snoozeMin?: number } = {}) {
  mutate((d) => {
    d.doseLogs = d.doseLogs.filter((l) => !(l.medicineId === med.id && l.due === due.toISOString()))
    d.doseLogs.push({
      id: `dl-${med.id}-${Date.now()}`,
      medicineId: med.id,
      profileId: med.profileId,
      due: due.toISOString(),
      status,
      at: status === 'snoozed' ? new Date(Date.now() + (opts.snoozeMin ?? 10) * 60000).toISOString() : new Date().toISOString(),
      reason: opts.reason,
    })
  })
}
