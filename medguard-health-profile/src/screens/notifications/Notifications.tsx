import { Bell, BellRing, Building2, FileCheck2, Lock, Pill, ShieldAlert, Sparkles, UserPlus, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../state/store'
import { useT } from '../../i18n'
import { Button, Card, cx, PageHeader, Screen, Toggle } from '../../components/ui'
import { EmptyState, Loadable } from '../../components/states'
import { useFakeLoad } from '../../mock/api'
import { fmtDateTime } from '../../lib/format'

const ICON = { reminder: Pill, processed: FileCheck2, access: ShieldAlert, emergency: ShieldAlert, hospital: Building2, queue: Users, invite: UserPlus, subscription: Sparkles, missed: BellRing }

/** H61 Inbox */
export function Inbox() {
  const { s, mutate } = useApp()
  const t = useT()
  const nav = useNavigate()
  const { state, retry } = useFakeLoad('inbox')
  const unread = s.notifications.filter((n) => !n.read).length
  return (
    <Screen>
      <PageHeader
        title={t('Notifications')}
        action={unread > 0 && <Button variant="tertiary" className="px-3" onClick={() => mutate((d) => d.notifications.forEach((n) => (n.read = true)))}>{t('Mark all read')}</Button>}
      />
      <Loadable state={state} retry={retry}>
        {s.notifications.length ? (
          <ul className="flex flex-col gap-2">
            {s.notifications.map((n) => {
              const I = ICON[n.kind] ?? Bell
              const danger = n.kind === 'emergency'
              return (
                <li key={n.id}>
                  <Card
                    onClick={() => {
                      mutate((d) => void (d.notifications.find((x) => x.id === n.id)!.read = true))
                      if (n.link) nav(n.link)
                    }}
                    className={cx(!n.read && 'border-primary-100 bg-primary-50', danger && 'border-danger-border bg-danger-bg')}
                  >
                    <div className="flex items-start gap-3">
                      <I className={cx('mt-0.5 size-5 shrink-0', danger ? 'text-danger-text' : 'text-primary-600')} aria-hidden />
                      <div className="flex-1">
                        <p className={cx('font-semibold', danger && 'text-danger-text')}>
                          {!n.read && <span className="sr-only">{t('Unread')}: </span>}
                          {n.title}
                        </p>
                        <p className="text-small text-ink-700">{n.body}</p>
                        <p className="mt-1 text-caption text-ink-700 tabular">{fmtDateTime(n.at)}</p>
                      </div>
                      {!n.read && <span className="mt-2 size-2.5 shrink-0 rounded-full bg-primary-600" aria-hidden />}
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState art="bell" text={t('No notifications yet.')} />
        )}
      </Loadable>
    </Screen>
  )
}

/** H62 = S10 Notification settings. Access + emergency alerts locked ON. */
export function NotifSettings() {
  const { s, mutate } = useApp()
  const t = useT()
  const rows: [string, string][] = [
    ['reminders', 'Medicine reminders'],
    ['missed', 'Missed doses (to caregivers)'],
    ['processed', 'Documents ready'],
    ['hospital', 'Hospital updates'],
    ['queue', 'Queue and urgent review answers'],
    ['invites', 'Caregiver invitations'],
    ['subscription', 'Subscription'],
  ]
  return (
    <Screen>
      <PageHeader title={t('Notifications')} />
      <Card className="py-1">
        {rows.map(([k, l]) => (
          <Toggle key={k} label={t(l)} checked={s.settings.notif[k] ?? true} onChange={(v) => mutate((d) => void (d.settings.notif[k] = v))} />
        ))}
      </Card>
      <h2 className="mt-6 mb-3 text-h2 font-semibold">{t('Always on')}</h2>
      <Card className="py-1">
        {['Someone opened your record', 'Emergency access'].map((l) => (
          <Toggle
            key={l}
            label={t(l)}
            checked
            locked
            desc={
              <span className="flex items-center gap-1">
                <Lock className="size-4" aria-hidden /> {t('Can’t be turned off')}
              </span>
            }
          />
        ))}
      </Card>
    </Screen>
  )
}
