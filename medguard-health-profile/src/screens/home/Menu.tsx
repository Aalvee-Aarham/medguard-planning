import { Bell, CircleHelp, Pill, Search, Settings, Share2, Sparkles, Stethoscope, Users } from 'lucide-react'
import { useApp } from '../../state/store'
import { useT } from '../../i18n'
import { List, ListRow, PageHeader, Screen } from '../../components/ui'

/** Menu: Similar cases · Medicines · Share & access · Family · Notifications · Premium · Settings · Help (+ Doctor home) */
export default function Menu() {
  const { s } = useApp()
  const t = useT()
  const unread = s.notifications.filter((n) => !n.read).length
  return (
    <Screen>
      <PageHeader title={t('Menu')} back={false} />
      <List>
        {s.account.type === 'doctor' && <ListRow icon={Stethoscope} title={t('Doctor home')} to="/doctor" />}
        <ListRow icon={Search} title={t('Similar cases')} to="/similar" />
        <ListRow icon={Pill} title={t('Medicines')} to="/medicines" />
        <ListRow icon={Share2} title={t('Share and access')} to="/share/access" />
        <ListRow icon={Users} title={t('Family')} to="/family" />
        <ListRow icon={Bell} title={t('Notifications')} sub={unread ? t('{n} unread', { n: unread }) : undefined} to="/notifications" />
        <ListRow icon={Sparkles} title={t('Premium')} sub={s.subscription.plan === 'premium' ? t('Active') : t('Free plan')} to="/premium" />
        <ListRow icon={Settings} title={t('Settings')} to="/settings" />
        <ListRow icon={CircleHelp} title={t('Help')} to="/help" />
      </List>
    </Screen>
  )
}
