import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, UserRound } from 'lucide-react'
import { useApp, uid } from '../../state/store'
import { useT } from '../../i18n'
import { Avatar, Button, Card, Input, List, ListRow, Note, PageHeader, Radio, Screen, SectionTitle } from '../../components/ui'
import { StatusChip } from '../../components/status'
import { ConfirmDialog } from '../../components/overlays'
import { EmptyState } from '../../components/states'

/* ---------------- I. Family and caregivers ---------------- */

/** H53 Family */
export function Family() {
  const { s, mutate, setLimitHit } = useApp()
  const t = useT()
  const nav = useNavigate()
  const max = s.subscription.plan === 'premium' ? 8 : 2
  return (
    <Screen>
      <PageHeader title={t('Family')} sub={<span className="tabular">{t('{n} of {max} profiles on your plan', { n: s.profiles.length, max })}</span>} />
      <ul className="flex flex-col gap-3">
        {s.profiles.map((p) => (
          <li key={p.id}>
            <Card>
              <div className="flex items-center gap-3">
                <Avatar name={p.name} size={48} />
                <div className="flex-1">
                  <p className="text-h3 font-semibold">{p.name}</p>
                  <p className="text-small text-ink-700">{p.relation === 'self' ? t('You') : t(p.relation[0].toUpperCase() + p.relation.slice(1))}</p>
                </div>
                {p.role === 'caregiver-view' && <StatusChip status="viewonly" />}
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    mutate((d) => void (d.activeProfileId = p.id))
                    nav('/record')
                  }}
                >
                  {t('Open record')}
                </Button>
                {p.role === 'owner' && p.relation !== 'self' && (
                  <Button variant="tertiary" className="flex-1" to={`/family/${p.id}/caregivers`}>
                    {t('Caregivers')}
                  </Button>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>
      <Button full className="mt-6" onClick={() => (s.profiles.length >= max ? setLimitHit('profiles') : nav('/family/add'))}>
        {t('Add family member')}
      </Button>
      {s.invites.some((i) => i.status === 'pending') && (
        <Note tone="info" className="mt-4">
          {t('You have an invitation to manage a profile.')}{' '}
          <a className="font-semibold underline" href={`/invites/${s.invites.find((i) => i.status === 'pending')!.id}`} onClick={(e) => (e.preventDefault(), nav(`/invites/${s.invites.find((i) => i.status === 'pending')!.id}`))}>
            {t('Open invitation')}
          </a>
        </Note>
      )}
    </Screen>
  )
}

/** H54 Add family member: create new, or link existing by invitation */
export function AddFamily() {
  const { mutate, toast } = useApp()
  const t = useT()
  const nav = useNavigate()
  const [mode, setMode] = useState('new')
  const [f, setF] = useState({ name: '', dob: '1990-01-01', sex: 'female', relation: 'father', phone: '' })
  return (
    <Screen>
      <PageHeader title={t('Add family member')} />
      <Radio
        name="mode"
        legend={t('How?')}
        value={mode}
        onChange={setMode}
        options={[
          { value: 'new', label: t('Create a new profile'), desc: t('For someone without MedGuard, like a child or parent') },
          { value: 'link', label: t('Link their existing account'), desc: t('They get an invitation to accept') },
        ]}
      />
      <form
        className="mt-6 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (mode === 'new') {
            if (!f.name.trim()) return
            const id = uid('p')
            mutate((d) => {
              d.profiles.push({ id, name: f.name.trim(), dob: f.dob, sex: f.sex as 'female', relation: f.relation as 'father', role: 'owner' })
              d.activeProfileId = id
            })
            toast(t('Profile created'))
            nav('/record')
          } else {
            toast(t('Invitation sent to {phone}', { phone: '+880 ' + f.phone }))
            nav('/family')
          }
        }}
      >
        {mode === 'new' ? (
          <>
            <Input label={t('Full name')} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
            <Input label={t('Date of birth')} type="date" value={f.dob} onChange={(e) => setF({ ...f, dob: e.target.value })} />
            <Radio name="sex2" legend={t('Sex')} value={f.sex} onChange={(v) => setF({ ...f, sex: v })} options={[{ value: 'female', label: t('Female') }, { value: 'male', label: t('Male') }]} />
            <Radio name="rel" legend={t('Relation to you')} value={f.relation} onChange={(v) => setF({ ...f, relation: v })} options={['father', 'mother', 'spouse', 'child', 'other'].map((r) => ({ value: r, label: t(r[0].toUpperCase() + r.slice(1)) }))} />
            <Button full type="submit">
              {t('Create profile')}
            </Button>
          </>
        ) : (
          <>
            <Input label={t('Their phone number')} inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} hint="+880" required />
            <Button full type="submit">
              {t('Send invitation')}
            </Button>
          </>
        )}
      </form>
    </Screen>
  )
}

/** H55 Caregivers: invite by phone, View only / Manage, Remove */
export function Caregivers() {
  const { profileId } = useParams()
  const { s, mutate, toast, online } = useApp()
  const t = useT()
  const [phone, setPhone] = useState('')
  const [perm, setPerm] = useState('view')
  const [rm, setRm] = useState<string | null>(null)
  const p = s.profiles.find((x) => x.id === profileId)
  if (!p) return <Screen><PageHeader title={t('Not found')} /></Screen>
  const list = s.caregivers.filter((c) => c.profileId === p.id)
  return (
    <Screen>
      <PageHeader title={t('Caregivers')} sub={t('People who help look after {name}', { name: p.name })} />
      {list.length ? (
        <List>
          {list.map((c) => (
            <ListRow
              key={c.id}
              icon={UserRound}
              title={c.name}
              sub={
                <span className="flex flex-wrap items-center gap-2">
                  {c.permission === 'manage' ? t('Can manage') : t('View only')}
                  {c.status === 'invited' && <StatusChip status="invited" />}
                </span>
              }
              right={
                <Button variant="tertiary" className="px-3 text-danger-text" onClick={() => setRm(c.id)}>
                  {t('Remove')}
                </Button>
              }
            />
          ))}
        </List>
      ) : (
        <EmptyState art="people" text={t('No caregivers yet.')} />
      )}
      <SectionTitle>{t('Invite a caregiver')}</SectionTitle>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (phone.replace(/\D/g, '').length < 10) return
          mutate((d) => {
            d.caregivers.push({ id: uid('c'), profileId: p.id, name: '+880 ' + phone, phone: '+880 ' + phone, permission: perm as 'view', status: 'invited' })
          })
          setPhone('')
          toast(t('Invitation sent'))
        }}
      >
        <Input label={t('Phone number')} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} hint="+880" />
        <Radio name="perm" legend={t('What can they do?')} value={perm} onChange={setPerm} options={[{ value: 'view', label: t('View only'), desc: t('See the record and reminders') }, { value: 'manage', label: t('Manage'), desc: t('Upload, edit, share and request urgent review') }]} />
        <Button full type="submit" disabled={!online} icon={Check}>
          {t('Send invitation')}
        </Button>
      </form>
      <ConfirmDialog
        open={!!rm}
        onClose={() => setRm(null)}
        title={t('Remove caregiver?')}
        body={t('They will lose access to {name}’s record straight away.', { name: p.name })}
        confirmLabel={t('Remove')}
        destructive
        onConfirm={() => mutate((d) => void (d.caregivers = d.caregivers.filter((c) => c.id !== rm)))}
      />
    </Screen>
  )
}

/** H56 Caregiver invitation: Accept / Decline */
export function Invitation() {
  const { id } = useParams()
  const { s, mutate, toast } = useApp()
  const t = useT()
  const nav = useNavigate()
  const inv = s.invites.find((i) => i.id === id)
  if (!inv) return <Screen><PageHeader title={t('Invitation not found')} /></Screen>
  const decide = (accept: boolean) => {
    mutate((d) => {
      const x = d.invites.find((i) => i.id === inv.id)!
      x.status = accept ? 'accepted' : 'declined'
      if (accept) d.profiles.push({ id: uid('p'), name: inv.profileName.replace(/ \(.*\)/, ''), dob: '1958-05-10', sex: 'male', relation: 'other', role: inv.permission === 'manage' ? 'caregiver-manage' : 'caregiver-view' })
    })
    toast(accept ? t('Invitation accepted') : t('Invitation declined'))
    nav('/family', { replace: true })
  }
  return (
    <Screen>
      <PageHeader title={t('Caregiver invitation')} />
      <Card className="flex flex-col items-center gap-3 text-center">
        <Avatar name={inv.from} size={64} />
        <p className="text-h3 font-semibold">{t('{from} invited you to help with {name}’s profile', { from: inv.from, name: inv.profileName })}</p>
        <StatusChip status={inv.permission === 'manage' ? 'active' : 'viewonly'} label={inv.permission === 'manage' ? t('Manage') : t('View only')} />
      </Card>
      {inv.status === 'pending' ? (
        <div className="mt-6 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => decide(false)}>
            {t('Decline')}
          </Button>
          <Button className="flex-1" onClick={() => decide(true)}>
            {t('Accept')}
          </Button>
        </div>
      ) : (
        <Note tone="neutral" className="mt-6">
          {inv.status === 'accepted' ? t('You accepted this invitation.') : t('You declined this invitation.')}
        </Note>
      )}
    </Screen>
  )
}
