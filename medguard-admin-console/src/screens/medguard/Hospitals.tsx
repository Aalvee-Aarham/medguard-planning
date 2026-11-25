import { useState, type FormEvent } from 'react'
import { Activity, Building2, CircleAlert, Video } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { demoUsers } from '../../app/session'
import { Button, Card, DataTable, Field, FormPage, Notice, PageHeader, StatTile, StatusChip } from '../../components'
import { useI18n } from '../../i18n'
import { id } from '../../mock/data'
import { useMock } from '../../mock/store'
import { normalizeContact, planLabel, teamPath, validContact } from './utils'
import './team.css'

export function Hospitals() {
  const { db, cameraOffline } = useMock()
  const { t, date } = useI18n()
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [health, setHealth] = useState('')
  const hospitals = db.hospitals.filter(hospital => (
    (!status || hospital.status === status) && (!health || hospital.health === health)
  ))
  const online = db.cameras.filter(camera => camera.status === 'Online' && !(cameraOffline && camera.id === 'cam-02'))
  const onboardAction = <Link className="button button-primary" to="/medguard/onboard">{t('Onboard hospital')}</Link>

  return (
    <div className="stack">
      <PageHeader
        title={t('Hospitals')}
        description={t('Monitor hospital onboarding and system health across MedGuard.')}
        actions={onboardAction}
      />
      <div className="grid-4">
        <StatTile label={t('Hospitals')} value={db.hospitals.length} icon={Building2} />
        <StatTile label={t('Active hospitals')} value={db.hospitals.filter(hospital => hospital.status === 'Active').length} icon={Activity} />
        <StatTile label={t('Needs attention')} value={db.hospitals.filter(hospital => hospital.health !== 'Healthy').length} icon={CircleAlert} />
        <StatTile label={t('Cameras online')} value={online.length} icon={Video} />
      </div>
      <Card title={t('Hospital directory')}>
        <DataTable
          rows={hospitals}
          rowKey={hospital => hospital.id}
          searchText={hospital => [hospital.name, hospital.address, t(planLabel(db.plans, hospital.plan))].join(' ')}
          searchLabel={t('Search hospitals')}
          filters={<>
            <Field label={t('Hospital status')}>
              <select value={status} onChange={event => setStatus(event.target.value)}>
                <option value="">{t('All statuses')}</option>
                {[...new Set(db.hospitals.map(hospital => hospital.status))].map(value => <option key={value} value={value}>{t(value)}</option>)}
              </select>
            </Field>
            <Field label={t('System health')}>
              <select value={health} onChange={event => setHealth(event.target.value)}>
                <option value="">{t('All health states')}</option>
                {['Healthy', 'Attention', 'Critical'].map(value => <option key={value} value={value}>{t(value)}</option>)}
              </select>
            </Field>
          </>}
          columns={[
            {
              heading: t('Hospital'), sort: hospital => hospital.name,
              cell: hospital => <div className="team-table-name"><Link to={teamPath(hospital.id, 'structure')}>{hospital.name}</Link><span className="muted">{hospital.address}</span></div>,
            },
            { heading: t('Status'), sort: hospital => t(hospital.status), cell: hospital => <StatusChip status={hospital.status} /> },
            { heading: t('Plan'), sort: hospital => t(planLabel(db.plans, hospital.plan)), cell: hospital => t(planLabel(db.plans, hospital.plan)) },
            { heading: t('System health'), sort: hospital => t(hospital.health), cell: hospital => <StatusChip status={hospital.health} /> },
            { heading: t('Renewal'), sort: hospital => hospital.renewal, cell: hospital => hospital.renewal ? date(hospital.renewal) : t('Not scheduled') },
          ]}
          emptyTitle={t('No hospitals found')}
          actions={hospital => [
            { label: t('Wards and rooms'), run: () => navigate(teamPath(hospital.id, 'structure')) },
            { label: t('Cameras'), run: () => navigate(teamPath(hospital.id, 'cameras')) },
            { label: t('Server and devices'), run: () => navigate(teamPath(hospital.id, 'infra')) },
          ]}
        />
      </Card>
    </div>
  )
}

const initialDetails = { name: '', address: '', plan: '', adminName: '', adminContact: '' }
type Details = typeof initialDetails

export function Onboard() {
  const { db, write } = useMock()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [details, setDetails] = useState<Details>(initialDetails)
  const [errors, setErrors] = useState<Partial<Details>>({})
  const [created, setCreated] = useState('')
  const steps = [t('Hospital details'), t('Plan'), t('First admin'), t('Done')]
  const chosenPlan = details.plan || db.plans[0]?.id || ''
  const dirty = !created && (step > 0 || details.name !== '' || details.address !== '')

  function change(key: keyof Details, value: string) {
    setDetails(current => ({ ...current, [key]: value }))
    setErrors(current => ({ ...current, [key]: undefined }))
  }

  function next(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: Partial<Details> = {}
    if (step === 0) {
      if (!details.name.trim()) nextErrors.name = t('Enter the hospital name.')
      if (db.hospitals.some(hospital => hospital.name.trim().toLowerCase() === details.name.trim().toLowerCase())) {
        nextErrors.name = t('A hospital with this name already exists.')
      }
      if (!details.address.trim()) nextErrors.address = t('Enter the hospital address.')
    } else if (step === 1 && !db.plans.some(plan => plan.id === chosenPlan)) {
      nextErrors.plan = t('Choose a plan.')
    } else if (step === 2) {
      if (!details.adminName.trim()) nextErrors.adminName = t('Enter the administrator name.')
      const contact = normalizeContact(details.adminContact)
      const adminContactInUse = db.hospitals.some(hospital => normalizeContact(hospital.adminContact) === contact)
        || demoUsers.some(user => user.area === 'hospital' && [user.contact, user.phone].some(value => value && normalizeContact(value) === contact))
      if (!validContact(details.adminContact)) nextErrors.adminContact = t('Enter a valid phone number or email address.')
      else if (adminContactInUse) nextErrors.adminContact = t('This phone number or email is already used by a hospital administrator.')
    }
    setErrors(nextErrors)
    if (Object.values(nextErrors).length) return
    if (step < 2) {
      setStep(step + 1)
      return
    }
    const hospitalId = id('hospital')
    const accountId = id('account')
    const name = details.name.trim()
    const contact = details.adminContact.trim()
    write('Onboarded hospital', name, current => ({
      ...current,
      hospitals: [...current.hospitals, {
        id: hospitalId,
        name,
        address: details.address.trim(),
        plan: chosenPlan,
        health: 'Attention',
        status: 'Onboarding',
        renewal: '',
        adminName: details.adminName.trim(),
        adminContact: contact,
        logo: '',
        consentEn: '',
        consentBn: '',
      }],
      accounts: [...current.accounts, {
        id: accountId,
        name: details.adminName.trim(),
        email: contact.includes('@') ? contact : '',
        phone: contact.includes('@') ? '' : contact,
        status: 'Invited',
        verified: false,
        plan: chosenPlan,
      }],
    }), { hospitalId })
    setCreated(hospitalId)
    setStep(3)
  }

  return (
    <div className="stack">
      <PageHeader title={t('Onboard hospital')} description={t('Set up a hospital, choose its plan, and invite its first administrator.')} />
      <ol className="team-stepper" aria-label={t('Onboarding steps')}>
        {steps.map((label, index) => (
          <li key={label} data-complete={index < step} aria-current={index === step ? 'step' : undefined}>
            <span>{index + 1}</span>{label}
          </li>
        ))}
      </ol>
      {created ? (
        <Card title={t('Hospital created')}>
          <div className="stack">
            <Notice tone="success">{t('The invitation for {name} was recorded in the demo.', { name: details.adminName.trim() })}</Notice>
            <div className="actions">
              <Link className="button button-primary" to={teamPath(created, 'structure')}>{t('Set up wards and rooms')}</Link>
              <Link to="/medguard">{t('Back to hospitals')}</Link>
            </div>
          </div>
        </Card>
      ) : (
        <FormPage
          onSubmit={next}
          dirty={dirty}
          saveLabel={step === 2 ? t('Create hospital') : t('Continue')}
          onCancel={() => navigate('/medguard')}
        >
          <Card title={steps[step]}>
            <div className="team-form-fields">
              {step === 0 && <>
                <Field label={t('Hospital name')} error={errors.name}>
                  <input value={details.name} onChange={event => change('name', event.target.value)} maxLength={120} />
                </Field>
                <Field label={t('Address')} error={errors.address}>
                  <textarea rows={3} value={details.address} onChange={event => change('address', event.target.value)} maxLength={300} />
                </Field>
              </>}
              {step === 1 && (
                <Field label={t('Subscription plan')} error={errors.plan}>
                  <select value={chosenPlan} onChange={event => change('plan', event.target.value)}>
                    {db.plans.map(plan => <option key={plan.id} value={plan.id}>{t(plan.name)} · {t('{beds} beds, {wards} wards', { beds: plan.beds, wards: plan.wards })}</option>)}
                  </select>
                </Field>
              )}
              {step === 2 && <>
                <Field label={t('Administrator name')} error={errors.adminName}>
                  <input autoComplete="off" value={details.adminName} onChange={event => change('adminName', event.target.value)} maxLength={120} />
                </Field>
                <Field label={t('Phone or email')} error={errors.adminContact}>
                  <input autoComplete="off" value={details.adminContact} onChange={event => change('adminContact', event.target.value)} maxLength={160} />
                </Field>
              </>}
            </div>
          </Card>
          {step > 0 && <Button type="button" variant="ghost" onClick={() => { setErrors({}); setStep(step - 1) }}>{t('Previous step')}</Button>}
        </FormPage>
      )}
    </div>
  )
}
