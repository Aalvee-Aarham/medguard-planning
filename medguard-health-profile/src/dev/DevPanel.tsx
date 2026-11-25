import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wrench, X } from 'lucide-react'
import { useApp, uid } from '../state/store'
import { MOTHER, SELF } from '../mock/seed'
import { doseId, upcoming } from '../lib/doses'
import type { Role } from '../mock/types'

/**
 * Dev panel (PLAN.md section 9): floating button, dev builds only (or ?dev in the URL).
 * Not translated on purpose: it is a developer tool, not part of the product.
 */
export function DevPanel() {
  const { s, mutate, reset, toast } = useApp()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const enabled = import.meta.env.DEV || new URLSearchParams(location.search).has('dev') || sessionStorage.getItem('mg-dev') === '1'
  if (!enabled) return null
  if (new URLSearchParams(location.search).has('dev')) sessionStorage.setItem('mg-dev', '1')
  const now = () => new Date().toISOString()

  const act: Record<string, () => void> = {
    'Admit (Rahima, Bed 7)': () => {
      mutate((d) => {
        const p = d.profiles.find((x) => x.id === MOTHER)!
        p.hospital = { state: 'admitted', hospital: 'Shanti Hospital', ward: 'Neuro Ward B', bed: 'Bed 7', since: now(), patientId: '1042' }
        d.activeProfileId = MOTHER
        d.grants.push({ id: 'g-hosp', profileId: MOTHER, who: 'Shanti Hospital', kind: 'hospital' })
        d.notifications.unshift({ id: uid('n'), kind: 'hospital', title: 'Rahima was admitted to Shanti Hospital', body: 'Neuro Ward B, Bed 7. The hospital can see her record until discharge.', at: now(), read: false, link: '/home', tier: 'normal' })
      })
      nav('/home')
    },
    'Put on waiting list': () => {
      mutate((d) => {
        const p = d.profiles.find((x) => x.id === MOTHER)!
        p.hospital = { state: 'waiting', hospital: 'Shanti Hospital', ward: 'Neuro Ward B', since: now(), queuePosition: 4 }
        d.activeProfileId = MOTHER
        d.notifications.unshift({ id: uid('n'), kind: 'queue', title: 'Rahima is on the waiting list', body: 'Shanti Hospital, Neuro Ward B. Position 4.', at: now(), read: false, link: '/home', tier: 'normal' })
      })
      nav('/home')
    },
    'Answer urgency request': () => {
      mutate((d) => {
        const p = d.profiles.find((x) => x.id === MOTHER)!
        if (!p.hospital?.urgency) return
        p.hospital.urgency.answer = 'raised'
        p.hospital.urgency.answerNote = 'Moved up after review by the ward manager.'
        p.hospital.queuePosition = 1
        d.notifications.unshift({ id: uid('n'), kind: 'queue', title: 'Priority raised', body: 'Rahima is now first in the queue for Neuro Ward B.', at: now(), read: false, link: '/home', tier: 'normal' })
      })
      toast('Urgency answered')
    },
    'Discharge': () => {
      mutate((d) => {
        const p = d.profiles.find((x) => x.id === MOTHER)!
        const since = p.hospital?.since ?? now()
        p.hospital = undefined
        d.grants = d.grants.filter((g) => g.id !== 'g-hosp')
        const aid = uid('a')
        d.admissions.unshift({ id: aid, profileId: MOTHER, hospital: 'Shanti Hospital', ward: 'Neuro Ward B', bed: 'Bed 7', from: since, to: now(), summary: 'Observed for raised blood pressure after stroke. Blood pressure controlled. Clopidogrel added for 21 days.', medicines: ['Clopidogrel 75 mg', 'Aspirin 75 mg'], results: ['Blood pressure 138/86 mmHg at discharge'], source: { kind: 'hospital', by: 'Shanti Hospital', at: now() } })
        d.medicines.push({ id: uid('med'), profileId: MOTHER, name: 'Clopidogrel', dose: '75 mg', times: ['09:00'], food: 'after', prescribedBy: 'Shanti Hospital', start: now(), current: true, source: { kind: 'hospital', by: 'Shanti Hospital', at: now() }, reminder: { on: true, days: [0, 1, 2, 3, 4, 5, 6], durationDays: 21, sound: 'Chime', tellCaregivers: true } })
        d.notifications.unshift({ id: uid('n'), kind: 'hospital', title: 'Discharge summary added', body: 'Shanti Hospital added the stay and 1 take-home medicine with reminders.', at: now(), read: false, link: `/admissions/${aid}`, tier: 'normal' })
      })
      nav('/medicines')
    },
    'Send emergency access': () => {
      const eid = uid('e')
      mutate((d) => {
        d.accessLog.unshift({ id: uid('l'), profileId: MOTHER, who: 'Dr. Salma Rahman, Shanti Hospital', action: 'emergency', at: now(), reason: 'Brought in unconscious, no QR', emergencyId: eid })
        d.notifications.unshift({ id: uid('n'), kind: 'emergency', title: 'Emergency access to Rahima’s profile', body: 'Shanti Hospital, Dr. Salma Rahman. Tap to see why.', at: now(), read: false, link: `/share/emergency/${eid}`, tier: 'high' })
      })
    },
    'Fire medicine reminder': () => {
      const u = upcoming(s, s.activeProfileId)[0] ?? upcoming(s, SELF)[0]
      if (!u) return toast('No upcoming dose')
      mutate((d) => {
        d.notifications.unshift({ id: uid('n'), kind: 'reminder', title: `Time for ${u.med.name} ${u.med.dose}`, body: 'Tap to mark Taken, Skip or Snooze.', at: now(), read: false, link: `/reminders/${doseId(u.med.id, u.due)}`, tier: 'high' })
      })
    },
    'Reset mock data': () => {
      reset()
      nav('/home')
    },
  }

  const roles: { r: Role | undefined; l: string }[] = [
    { r: undefined, l: 'Owner' },
    { r: 'caregiver-view', l: 'Caregiver (view)' },
    { r: 'caregiver-manage', l: 'Caregiver (manage)' },
    { r: 'doctor', l: 'Doctor' },
  ]

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Open dev panel" className="fixed right-3 bottom-24 z-40 grid lg:right-6 lg:bottom-6 size-12 place-items-center rounded-full border border-border-input bg-surface text-ink-700 shadow-float">
        <Wrench className="size-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink-900/40" onClick={() => setOpen(false)}>
          <div className="max-h-[85dvh] w-full max-w-[480px] overflow-y-auto rounded-t-sheet md:mb-6 md:rounded-sheet bg-surface p-4 shadow-float" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Dev panel">
            <div className="mb-3 flex items-center">
              <h2 className="flex-1 text-h2 font-semibold">Dev panel</h2>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="grid size-12 place-items-center rounded-full hover:bg-primary-50">
                <X className="size-6" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['offline', 'Offline'],
                  ['forceErrors', 'Force API errors'],
                  ['forcedUpdate', 'Forced update'],
                  ['maintenance', 'Maintenance'],
                ] as const
              ).map(([k, l]) => (
                <label key={k} className="flex min-h-12 items-center gap-2 rounded-control border border-border-subtle px-3">
                  <input type="checkbox" className="size-5 accent-primary-600" checked={s.dev[k]} onChange={(e) => mutate((d) => void (d.dev[k] = e.target.checked))} />
                  <span className="text-small font-semibold">{l}</span>
                </label>
              ))}
            </div>
            <p className="mt-4 mb-2 text-small font-semibold text-ink-700">Hospital and alerts</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(act).map(([l, f]) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => {
                    f()
                    setOpen(false)
                  }}
                  className="btn min-h-12 rounded-control border border-primary-600 px-2 text-small font-semibold text-primary-600 hover:bg-primary-50"
                >
                  {l}
                </button>
              ))}
            </div>
            <p className="mt-4 mb-2 text-small font-semibold text-ink-700">Role on the open profile</p>
            <div className="grid grid-cols-2 gap-2">
              {roles.map(({ r, l }) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={s.dev.roleOverride === r}
                  onClick={() => {
                    mutate((d) => {
                      d.dev.roleOverride = r
                      if (r === 'doctor') {
                        d.account.type = 'doctor'
                        d.account.doctor = d.account.doctor ?? { name: 'Dr. Karim Hossain', bmdc: 'A-12345', specialty: 'Neurology', chamber: 'Green Road, Dhanmondi', verified: true }
                      } else d.account.type = 'personal'
                    })
                    setOpen(false)
                    if (r === 'doctor') nav('/doctor')
                  }}
                  className={`btn min-h-12 rounded-control border px-2 text-small font-semibold ${s.dev.roleOverride === r ? 'border-primary-600 bg-primary-100 text-primary-700' : 'border-border-subtle'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
