import { useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, DataTable, EmptyState, Field, FormPage, Notice, PageHeader, ReasonDialog, StatusChip } from '../../components'
import { useI18n } from '../../i18n'
import { id, type Staff } from '../../mock/data'
import { useHospital } from './useHospital'

const roles = ['Nurse', 'Doctor', 'Ward manager', 'Admission desk'] as const
const tiers = ['Consultant', 'MO', 'Intern'] as const
const statuses = ['Active', 'Invited', 'Deactivated'] as const

export function StaffList() {
  const { t } = useI18n()
  const { db, hospitalId, wards, write } = useHospital()
  const navigate = useNavigate()
  const [role, setRole] = useState('')
  const [ward, setWard] = useState('')
  const [status, setStatus] = useState('')
  const [confirm, setConfirm] = useState<Staff>()
  const [feedback, setFeedback] = useState('')
  const staff = db.staff.filter((member) => member.hospitalId === hospitalId)
  const rows = staff.filter((member) => (!role || member.role === role)
    && (!ward || member.wardIds.includes(ward)) && (!status || member.status === status))
  const wardNames = (member: Staff) => wards.filter(({ id }) => member.wardIds.includes(id)).map(({ name }) => name).join(', ')
  const roleName = (member: Staff) => member.isSenior ? t('Senior nurse') : t(member.role)
  const openInvite = () => navigate('/hospital/staff/new')
  const invite = (main = false) => (
    <Button variant={main ? 'primary' : 'secondary'} onClick={openInvite}><Plus size={18} />{t('Invite staff')}</Button>
  )

  return (
    <div className="stack">
      <PageHeader title={t('Staff')} description={t('Manage ward access and roles for hospital staff.')} actions={invite(true)} />
      {feedback && <Notice tone="success">{t('{name} was deactivated.', { name: feedback })}</Notice>}
      <DataTable
        rows={rows}
        rowKey={(member) => member.id}
        searchText={(member) => [member.name, member.phone, roleName(member), t(member.status), wardNames(member)].join(' ')}
        searchLabel={t('Search staff')}
        filters={<>
          <Field label={t('Role')}>
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="">{t('All roles')}</option>
              {roles.map((value) => <option key={value} value={value}>{t(value)}</option>)}
            </select>
          </Field>
          <Field label={t('Ward')}>
            <select value={ward} onChange={(event) => setWard(event.target.value)}>
              <option value="">{t('All wards')}</option>
              {wards.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
            </select>
          </Field>
          <Field label={t('Status')}>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">{t('All statuses')}</option>
              {statuses.map((value) => <option key={value} value={value}>{t(value)}</option>)}
            </select>
          </Field>
        </>}
        columns={[
          { heading: t('Name'), cell: (member) => <strong>{member.name}</strong>, sort: (member) => member.name },
          { heading: t('Phone'), cell: (member) => member.phone, sort: (member) => member.phone },
          { heading: t('Role'), cell: roleName, sort: roleName },
          { heading: t('Wards'), cell: (member) => wardNames(member) || t('Unassigned'), sort: wardNames },
          { heading: t('Status'), cell: (member) => <StatusChip status={member.status} />, sort: (member) => t(member.status) },
        ]}
        actions={(member) => [
          { label: t('Edit staff'), run: () => navigate(`/hospital/staff/${member.id}`) },
          ...(member.status === 'Deactivated' ? [] : [{ label: t('Deactivate staff'), run: () => setConfirm(member), danger: true }]),
        ]}
        emptyTitle={staff.length ? t('No staff match these filters.') : t('No staff yet.')}
        emptyAction={staff.length ? undefined : invite()}
      />
      {confirm && <ReasonDialog
        title={t('Deactivate {name}?', { name: confirm.name })}
        description={t('Access removed immediately. Audit history kept.')}
        confirmLabel={t('Deactivate staff')}
        danger
        onClose={() => setConfirm(undefined)}
        onConfirm={(reason) => {
          write('Staff deactivated', confirm.name, (current) => ({
            ...current,
            staff: current.staff.map((member) => member.id === confirm.id ? { ...member, status: 'Deactivated' } : member),
          }), { reason })
          setFeedback(confirm.name)
          setConfirm(undefined)
        }}
      />}
    </div>
  )
}

type StaffDraft = Pick<Staff, 'name' | 'phone' | 'role' | 'doctorTier' | 'isSenior' | 'wardIds'>
type StaffError = Partial<Record<keyof StaffDraft, string>>

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '').replace(/^880(?=1\d{9}$)/, '0')
}

export function StaffForm() {
  const { t } = useI18n()
  const params = useParams()
  const staffId = params.id ?? params.staffId
  const { db, hospitalId } = useHospital()
  const navigate = useNavigate()
  const member = db.staff.find((staff) => staff.id === staffId && staff.hospitalId === hospitalId)

  if (staffId && !member) return (
    <div className="stack">
      <PageHeader title={t('Edit staff')} />
      <EmptyState title={t('Staff member unavailable')} description={t('Open a staff record from your hospital staff list.')}
        action={<Button variant="secondary" onClick={() => navigate('/hospital/staff')}>{t('Back to staff')}</Button>} />
    </div>
  )

  return <StaffEditor key={member?.id ?? 'new'} member={member} />
}

function StaffEditor({ member }: { member?: Staff }) {
  const { t } = useI18n()
  const { db, hospitalId, wards, write } = useHospital()
  const navigate = useNavigate()
  const initial: StaffDraft = {
    name: member?.name ?? '', phone: member?.phone ?? '', role: member?.role ?? 'Nurse',
    doctorTier: member?.doctorTier ?? '', isSenior: member?.isSenior ?? false, wardIds: member?.wardIds ?? [],
  }
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<StaffError>({})
  const [invited, setInvited] = useState(false)
  const [saved, setSaved] = useState(false)
  const dirty = !invited && JSON.stringify(initial) !== JSON.stringify(draft)
  const back = () => navigate('/hospital/staff')

  function change<K extends keyof StaffDraft>(key: K, value: StaffDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    setSaved(false)
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: StaffError = {}
    const phone = draft.phone.trim()
    const normalizedPhone = normalizePhone(phone)
    if (!draft.name.trim()) next.name = 'Enter the staff member’s name.'
    if (!/^\+?[\d ()-]+$/.test(phone) || normalizedPhone.length < 7 || normalizedPhone.length > 15) {
      next.phone = 'Enter a phone number with 7 to 15 digits.'
    } else if (db.staff.some((staff) => staff.hospitalId === hospitalId && staff.id !== member?.id && normalizePhone(staff.phone) === normalizedPhone)) {
      next.phone = 'This phone number is already assigned to a staff member.'
    }
    if (draft.role === 'Doctor' && !draft.doctorTier) next.doctorTier = 'Select a doctor tier.'
    if (!draft.wardIds.length && wards.length) next.wardIds = 'Select at least one ward.'
    setErrors(next)
    if (Object.keys(next).length) return

    const record: Staff = {
      ...draft, id: member?.id ?? id('staff'), hospitalId, name: draft.name.trim(), phone,
      doctorTier: draft.role === 'Doctor' ? draft.doctorTier : '',
      isSenior: draft.role === 'Nurse' && draft.isSenior, status: member?.status ?? 'Invited',
    }
    write(member ? 'Staff updated' : 'Staff invited', record.name, (current) => ({
      ...current,
      staff: member ? current.staff.map((staff) => staff.id === member.id ? record : staff) : [...current.staff, record],
    }))
    setDraft(recordToDraft(record))
    setInvited(!member)
    setSaved(Boolean(member))
  }

  if (invited) return (
    <div className="stack">
      <PageHeader title={t('Invitation sent')} />
      <Notice tone="success">{t('A mock SMS invitation was sent to {phone}.', { phone: draft.phone })}</Notice>
      <div className="actions">
        <Button variant="secondary" onClick={back}>{t('Back to staff')}</Button>
        <Button onClick={() => { setDraft(initial); setErrors({}); setInvited(false) }}>{t('Invite another staff member')}</Button>
      </div>
    </div>
  )

  return (
    <div className="stack">
      <PageHeader title={t(member ? 'Edit staff' : 'Invite staff')}
        description={member ? member.name : t('Assign a role and wards before sending the mock SMS invitation.')} />
      {saved && <Notice tone="success">{t('Staff changes saved.')}</Notice>}
      <FormPage onSubmit={save} dirty={dirty} saveLabel={t(member ? 'Save changes' : 'Send invitation')} onCancel={back}>
        <Card title={t('Staff details')}>
          <div className="grid-2">
            <Field label={t('Full name')} error={errors.name ? t(errors.name) : undefined}>
              <input value={draft.name} onChange={(event) => change('name', event.target.value)} maxLength={100} autoComplete="name" />
            </Field>
            <Field label={t('Phone')} error={errors.phone ? t(errors.phone) : undefined}>
              <input value={draft.phone} onChange={(event) => change('phone', event.target.value)} type="tel" autoComplete="tel" />
            </Field>
            <Field label={t('Role')}>
              <select value={draft.role} onChange={(event) => change('role', event.target.value as Staff['role'])}>
                {roles.map((role) => <option key={role} value={role}>{t(role)}</option>)}
              </select>
            </Field>
            {draft.role === 'Doctor' && <Field label={t('Doctor tier')} error={errors.doctorTier ? t(errors.doctorTier) : undefined}>
              <select value={draft.doctorTier} onChange={(event) => change('doctorTier', event.target.value as Staff['doctorTier'])}>
                <option value="">{t('Select a doctor tier')}</option>
                {tiers.map((tier) => <option key={tier} value={tier}>{t(tier)}</option>)}
              </select>
            </Field>}
            {draft.role === 'Nurse' && <label className="check-row hospital-senior"><input type="checkbox" checked={draft.isSenior}
              onChange={(event) => change('isSenior', event.target.checked)} />{t('Senior nurse')}</label>}
          </div>
        </Card>
        <Card title={t('Ward access')} description={t('Choose the wards this staff member can access.')}>
          {wards.length ? <fieldset className="hospital-fieldset" aria-label={t('Ward access')}>
            <div className="grid-2">
              {wards.map((ward) => <label key={ward.id} className="check-row">
                <input type="checkbox" checked={draft.wardIds.includes(ward.id)} onChange={(event) => change('wardIds', event.target.checked
                  ? [...draft.wardIds, ward.id] : draft.wardIds.filter((wardId) => wardId !== ward.id))} />
                {ward.name}
              </label>)}
            </div>
            {errors.wardIds && <p className="hospital-field-error" role="alert">{t(errors.wardIds)}</p>}
          </fieldset> : <p className="muted">{t('No wards are configured for this hospital.')}</p>}
        </Card>
      </FormPage>
    </div>
  )
}

function recordToDraft({ name, phone, role, doctorTier, isSenior, wardIds }: Staff): StaffDraft {
  return { name, phone, role, doctorTier, isSenior, wardIds }
}
