import { useEffect, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Download, Wrench } from 'lucide-react'
import { useApp } from '../state/store'
import { useT } from '../i18n'
import { setFormatLang } from '../lib/format'
import { Button } from '../components/ui'
import { FullMessage } from '../components/states'
import { LimitSheet, Toast } from '../components/overlays'
import { LockScreen } from '../screens/onboarding/Auth'
import { DevPanel } from '../dev/DevPanel'

const PUBLIC = /^\/($|start|auth|lock)/

/**
 * App-wide states: forced update, maintenance, session lock (H16 overlay keeps unsaved input),
 * sign-in guard, auto-lock after inactivity, Limit sheet (H60), toasts, Dev panel.
 */
export function Gates({ children }: { children: ReactNode }) {
  const { s, mutate } = useApp()
  const t = useT()
  const loc = useLocation()
  const nav = useNavigate()
  setFormatLang(s.settings.lang)

  // Guard: signed-out users only see public routes
  useEffect(() => {
    if (!s.session.signedIn && !PUBLIC.test(loc.pathname)) nav('/', { replace: true })
  }, [s.session.signedIn, loc.pathname, nav])

  // Auto-lock after inactivity (safety rule 15)
  useEffect(() => {
    if (!s.session.signedIn) return
    let id = 0
    const arm = () => {
      window.clearTimeout(id)
      id = window.setTimeout(() => mutate((d) => void (d.session.locked = true)), s.settings.autoLockMin * 60000)
    }
    const evs = ['pointerdown', 'keydown', 'scroll'] as const
    evs.forEach((e) => window.addEventListener(e, arm, { passive: true }))
    arm()
    return () => {
      window.clearTimeout(id)
      evs.forEach((e) => window.removeEventListener(e, arm))
    }
  }, [s.session.signedIn, s.settings.autoLockMin, mutate])

  // Upload processor: advances "AI reading" even when the user leaves H21 (PLAN.md: "You can leave")
  const processing = s.batches.some((b) => b.status === 'processing')
  useEffect(() => {
    if (!processing) return
    const id = window.setInterval(() => {
      mutate((d) => {
        for (const b of d.batches.filter((x) => x.status === 'processing')) {
          b.progress = Math.min(100, b.progress + 9)
          if (b.progress < 100) continue
          const who = d.profiles.find((p) => p.id === b.profileId)?.name ?? ''
          if (d.dev.forceErrors) {
            b.status = 'failed'
            b.failReason = 'The photos are too dark to read.'
          } else b.status = b.issues.length ? 'issues' : 'review'
          d.notifications.unshift({
            id: `n-${b.id}`, kind: 'processed', tier: 'normal', read: false, at: new Date().toISOString(),
            title: b.status === 'failed' ? t('Could not read {name}’s documents', { name: who }) : t('{name}’s documents are ready to check', { name: who }),
            body: b.status === 'issues' ? t('{n} things need you first.', { n: b.issues.length }) : b.status === 'failed' ? t('Try again or type it in.') : t('Check what AI found before it is saved.'),
            link: `/upload/${b.id}/${b.status}`,
          })
        }
      })
    }, 350)
    return () => window.clearInterval(id)
  }, [processing, mutate, t])

  if (s.dev.forcedUpdate)
    return (
      <div className="app-col">
        <FullMessage icon={Download} title={t('Update MedGuard to continue')} body={t('This version has a safety fix. Your data is saved and opens again after the update.')} action={<Button onClick={() => mutate((d) => void (d.dev.forcedUpdate = false))}>{t('Update now')}</Button>} />
      </div>
    )
  if (s.dev.maintenance)
    return (
      <div className="app-col">
        <FullMessage icon={Wrench} title={t('MedGuard is being updated')} body={t('Back by 2:00 AM. Your saved record and reminders still work offline.')} action={<Button variant="secondary" onClick={() => mutate((d) => void (d.dev.maintenance = false))}>{t('Open saved data')}</Button>} />
        <DevPanel />
      </div>
    )

  return (
    <>
      {children}
      {s.session.signedIn && s.session.locked && !PUBLIC.test(loc.pathname) && <LockScreen overlay />}
      <LimitSheet />
      <Toast />
      <DevPanel />
    </>
  )
}
