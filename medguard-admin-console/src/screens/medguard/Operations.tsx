import { useState, type FormEvent } from 'react'
import { Activity, CreditCard, Database as StorageIcon, Plus, Search } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Button, Card, DataTable, EmptyState, Field, FormPage, Notice, PageHeader, StatTile, StatusChip } from '../../components'
import { useI18n } from '../../i18n'
import { id, type Drug } from '../../mock/data'
import { useMock } from '../../mock/store'
import { HospitalMissing } from './Structure'
import { normalizeContact, planLabel, sameName, teamPath, validContact } from './utils'
import './team.css'

const bdt = new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', currencyDisplay: 'code', maximumFractionDigits: 0 })

export function Infrastructure() {
  const { id: hospitalId = '' } = useParams()
  const { db } = useMock()
  const { t, date } = useI18n()
  const [kind, setKind] = useState('')
  const hospital = db.hospitals.find(item => item.id === hospitalId)
  const server = db.servers.find(item => item.hospitalId === hospitalId)
  const registeredDevices = db.devices.filter(device => device.hospitalId === hospitalId)
  const devices = registeredDevices.filter(device => !kind || device.type === kind)

  if (!hospital) return <HospitalMissing />

  return (
    <div className="stack">
      <PageHeader title={t('Server and devices')} description={hospital.name} actions={<Link to={teamPath(hospital.id, 'cameras')}>{t('Manage cameras')}</Link>} />
      {server ? (
        <>
          <div className="grid-2">
            <StatTile
              label={t('Server load')}
              value={`${server.load}%`}
              icon={Activity}
              detail={<meter className="team-meter" aria-label={t('Server load')} min={0} max={100} value={server.load} />}
            />
            <StatTile
              label={t('Storage used')}
              value={`${server.storage}%`}
              icon={StorageIcon}
              detail={<meter className="team-meter" aria-label={t('Storage used')} min={0} max={100} value={server.storage} />}
            />
          </div>
          <Card title={t('Local server')}>
            <dl className="team-details grid-3">
              <div><dt>{t('Server')}</dt><dd>{server.name}</dd></div>
              <div><dt>{t('AI model version')}</dt><dd>{t(server.model)} {server.version}</dd></div>
              <div><dt>{t('Last sync')}</dt><dd>{date(server.lastSync, true)}</dd></div>
            </dl>
          </Card>
        </>
      ) : <Card title={t('Local server')}><EmptyState title={t('No server registered')} description={t('Server details will appear here after registration.')} /></Card>}
      <Card title={t('Registered devices')}>
        <DataTable
          rows={devices}
          rowKey={device => device.id}
          searchLabel={t('Search devices')}
          searchText={device => [t(device.name), t(device.type), t(device.status)].join(' ')}
          emptyTitle={t('No devices found')}
          filters={<Field label={t('Device type')}>
            <select value={kind} onChange={event => setKind(event.target.value)}>
              <option value="">{t('All device types')}</option>
              {[...new Set(registeredDevices.map(device => device.type))].map(value => <option key={value} value={value}>{t(value)}</option>)}
            </select>
          </Field>}
          columns={[
            { heading: t('Device'), sort: device => t(device.name), cell: device => t(device.name) },
            { heading: t('Type'), sort: device => t(device.type), cell: device => t(device.type) },
            { heading: t('Status'), sort: device => t(device.status), cell: device => <StatusChip status={device.status} /> },
            { heading: t('Last sync'), sort: device => device.lastSync, cell: device => date(device.lastSync, true) },
          ]}
        />
      </Card>
    </div>
  )
}

export function Billing() {
  const { db } = useMock()
  const { t, date } = useI18n()
  const [hospital, setHospital] = useState('')
  const [status, setStatus] = useState('')
  const invoices = db.invoices.filter(invoice => (
    (!hospital || invoice.hospitalId === hospital) && (!status || invoice.status === status)
  ))
  const hospitalName = (hospitalId: string) => db.hospitals.find(item => item.id === hospitalId)?.name ?? t('Hospital unavailable')

  return (
    <div className="stack">
      <PageHeader title={t('Plans and billing')} description={t('Review subscription coverage, prices, and hospital invoices.')} />
      <div className="grid-3">
        {db.plans.map(plan => (
          <StatTile label={t(plan.name)} key={plan.id} value={bdt.format(plan.price)} icon={CreditCard} detail={t('{beds} beds, {wards} wards', { beds: plan.beds, wards: plan.wards })} />
        ))}
      </div>
      <Card title={t('Invoices')}>
        <DataTable
          rows={invoices}
          rowKey={invoice => invoice.id}
          searchText={invoice => [invoice.id, hospitalName(invoice.hospitalId), t(invoice.status)].join(' ')}
          searchLabel={t('Search invoices')}
          emptyTitle={t('No invoices found')}
          filters={<>
            <Field label={t('Hospital')}>
              <select value={hospital} onChange={event => setHospital(event.target.value)}>
                <option value="">{t('All hospitals')}</option>
                {db.hospitals.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </Field>
            <Field label={t('Status')}>
              <select value={status} onChange={event => setStatus(event.target.value)}>
                <option value="">{t('All statuses')}</option>
                {[...new Set(db.invoices.map(invoice => invoice.status))].map(value => <option key={value} value={value}>{t(value)}</option>)}
              </select>
            </Field>
          </>}
          columns={[
            { heading: t('Invoice'), sort: invoice => invoice.id, cell: invoice => invoice.id },
            { heading: t('Hospital'), sort: invoice => hospitalName(invoice.hospitalId), cell: invoice => hospitalName(invoice.hospitalId) },
            { heading: t('Date'), sort: invoice => invoice.date, cell: invoice => date(invoice.date) },
            { heading: t('Amount'), sort: invoice => invoice.amount, cell: invoice => bdt.format(invoice.amount) },
            { heading: t('Status'), sort: invoice => t(invoice.status), cell: invoice => <StatusChip status={invoice.status} /> },
          ]}
        />
      </Card>
    </div>
  )
}

const drugFields = { brand: 'Brand', generic: 'Generic', strength: 'Strength', form: 'Form' }
type DrugKey = keyof typeof drugFields
const keys = Object.keys(drugFields) as DrugKey[]
const emptyDrug: Drug = { id: '', brand: '', generic: '', strength: '', form: '', source: 'base' }

export function Formulary() {
  const { db, write } = useMock()
  const { t } = useI18n()
  const drugs = db.drugs.filter(drug => drug.source === 'base')
  const [drug, setDrug] = useState<Drug | null>(null)
  const [errors, setErrors] = useState<Partial<Record<DrugKey, string>>>({})
  const [form, setForm] = useState('')
  const rows = drugs.filter(item => !form || item.form === form)
  const original = drugs.find(item => item.id === drug?.id) ?? emptyDrug

  function edit(item: Drug) {
    setErrors({})
    setDrug(item)
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!drug) return
    const normalized = { ...drug, brand: drug.brand.trim(), generic: drug.generic.trim(), strength: drug.strength.trim(), form: drug.form.trim() }
    const nextErrors: Partial<Record<DrugKey, string>> = {}
    keys.forEach(key => {
      if (!normalized[key]) nextErrors[key] = t('Fill in this field.')
    })
    if (drugs.some(item => item.id !== drug.id && ['brand', 'strength', 'form'].every(key => sameName(item[key as DrugKey], normalized[key as DrugKey])))) {
      nextErrors.brand = t('This brand, strength, and form already exist.')
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    const record = { ...normalized, id: normalized.id || id('drug') }
    write(normalized.id ? 'Updated base formulary drug' : 'Added base formulary drug', record.brand, current => ({
      ...current,
      drugs: normalized.id ? current.drugs.map(item => item.id === normalized.id ? record : item) : [...current.drugs, record],
    }))
    setDrug(null)
  }

  return (
    <div className="stack">
      <PageHeader
        title={t('Base formulary')}
        description={t('Manage brand-to-generic mappings shared by all hospitals.')}
        actions={!drug && <Button type="button" onClick={() => edit(emptyDrug)}><Plus aria-hidden="true" size={18} />{t('Add drug')}</Button>}
      />
      {drug && (
        <FormPage onSubmit={save} dirty={keys.some(key => drug[key] !== original[key])} onCancel={() => setDrug(null)} saveLabel={t('Save drug')}>
          <Card title={t(drug.id ? 'Edit drug' : 'Add drug')}>
            <div className="team-form-fields grid-2">
              {keys.map(key => (
                <Field label={t(drugFields[key])} error={errors[key]} key={key}>
                  <input value={drug[key]} maxLength={100} autoFocus={key === 'brand'} onChange={event => {
                    setDrug({ ...drug, [key]: event.target.value })
                    setErrors(current => ({ ...current, [key]: undefined }))
                  }} />
                </Field>
              ))}
            </div>
          </Card>
        </FormPage>
      )}
      <Card title={t('Drug directory')}>
        <DataTable<Drug>
          rows={rows}
          rowKey={item => item.id}
          searchLabel={t('Search drugs')}
          searchText={item => [item.brand, item.generic, item.strength, t(item.form)].join(' ')}
          filters={<Field label={t('Form')}>
            <select value={form} onChange={event => setForm(event.target.value)}>
              <option value="">{t('All forms')}</option>
              {[...new Set(drugs.map(item => item.form))].map(value => <option key={value} value={value}>{t(value)}</option>)}
            </select>
          </Field>}
          emptyTitle={t('No drugs found')}
          columns={keys.map(key => ({
            heading: t(drugFields[key]),
            sort: item => key === 'form' ? t(item[key]) : item[key],
            cell: item => key === 'form' ? t(item[key]) : item[key],
          }))}
          actions={drug ? undefined : item => [{ label: t('Edit drug'), run: () => edit(item) }]}
        />
      </Card>
    </div>
  )
}

export function Bmdc() {
  const { db } = useMock()
  const { t, date } = useI18n()
  const [status, setStatus] = useState('')
  const checks = db.bmdc.filter(check => !status || check.status === status)

  return (
    <div className="stack">
      <PageHeader title={t('BMDC check log')} description={t('Review the results of automatic doctor registration checks.')} />
      <Card title={t('Registration checks')}>
        <DataTable
          rows={checks}
          rowKey={check => check.id}
          searchLabel={t('Search registration checks')}
          searchText={check => [check.name, check.registration, t(check.details)].join(' ')}
          emptyTitle={t('No registration checks found')}
          filters={<Field label={t('Result')}>
            <select value={status} onChange={event => setStatus(event.target.value)}>
              <option value="">{t('All results')}</option>
              {[...new Set(db.bmdc.map(check => check.status))].map(value => <option key={value} value={value}>{t(value)}</option>)}
            </select>
          </Field>}
          columns={[
            { heading: t('Doctor'), sort: check => check.name, cell: check => check.name },
            { heading: t('BMDC registration'), sort: check => check.registration, cell: check => check.registration },
            { heading: t('Result'), sort: check => t(check.status), cell: check => <StatusChip status={check.status} /> },
            { heading: t('Details'), sort: check => t(check.details), cell: check => t(check.details) },
            { heading: t('Checked at'), sort: check => check.at, cell: check => date(check.at, true) },
          ]}
        />
      </Card>
    </div>
  )
}

type Lookup = { status: string; verified: boolean; plan: string }

export function Support() {
  const { db, write } = useMock()
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<Lookup | null | undefined>(undefined)
  const [error, setError] = useState('')

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validContact(query)) {
      setError(t('Enter a valid phone number or email address.'))
      setResult(undefined)
      return
    }
    const contact = normalizeContact(query)
    const account = db.accounts.find(item => normalizeContact(item.phone) === contact || normalizeContact(item.email) === contact)
    setResult(account ? { status: account.status, verified: account.verified, plan: account.plan } : null)
    write('Looked up account', account?.id ?? 'No match', current => current)
  }

  return (
    <div className="stack">
      <PageHeader title={t('Support lookup')} description={t('Find the current status of an account by phone or email.')} />
      <Notice>{t("No health data without the user's consent")}</Notice>
      <Card title={t('Find an account')}>
        <form className="team-lookup" onSubmit={search}>
          <Field label={t('Phone or email')} error={error}>
            <input value={query} autoComplete="off" maxLength={160} onChange={event => { setQuery(event.target.value); setError(''); setResult(undefined) }} />
          </Field>
          <Button type="submit"><Search aria-hidden="true" size={18} />{t('Look up account')}</Button>
        </form>
      </Card>
      <div aria-live="polite">
        {result === null && <Card><EmptyState title={t('No matching account')} description={t('Check the phone number or email address and try again.')} /></Card>}
        {result && <Card title={t('Account status')}>
          <dl className="team-details grid-3">
            <div><dt>{t('Account status')}</dt><dd><StatusChip status={result.status} /></dd></div>
            <div><dt>{t('Verification')}</dt><dd><StatusChip status={result.verified ? 'Verified' : 'Unverified'} /></dd></div>
            <div><dt>{t('Plan')}</dt><dd>{t(planLabel(db.plans, result.plan))}</dd></div>
          </dl>
        </Card>}
      </div>
    </div>
  )
}

export function Audit() {
  const { db } = useMock()
  const { t, date } = useI18n()
  const [actor, setActor] = useState('')
  const [action, setAction] = useState('')
  const [day, setDay] = useState('')
  const entries = db.audit.filter(entry => entry.area === 'medguard')
  const dateKey = (value: string) => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(value))
  const filtered = entries.filter(entry => (!actor || entry.who === actor) && (!action || entry.action === action) && (!day || dateKey(entry.at) === day))
    .sort((left, right) => Date.parse(right.at) - Date.parse(left.at))

  return (
    <div className="stack">
      <PageHeader title={t('Team audit log')} description={t('Review changes and recorded actions made by the MedGuard team.')} />
      <Card title={t('Team activity')}>
        <DataTable
          rows={filtered}
          rowKey={entry => entry.id}
          searchLabel={t('Search team activity')}
          searchText={entry => [entry.who, t(entry.action), t(entry.target)].join(' ')}
          emptyTitle={t('No team activity found')}
          filters={<>
            <Field label={t('Team member')}>
              <select value={actor} onChange={event => setActor(event.target.value)}>
                <option value="">{t('All team members')}</option>
                {[...new Set(entries.map(entry => entry.who))].map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </Field>
            <Field label={t('Action')}>
              <select value={action} onChange={event => setAction(event.target.value)}>
                <option value="">{t('All actions')}</option>
                {[...new Set(entries.map(entry => entry.action))].map(value => <option key={value} value={value}>{t(value)}</option>)}
              </select>
            </Field>
            <Field label={t('Date')}>
              <input type="date" value={day} onChange={event => setDay(event.target.value)} />
            </Field>
          </>}
          columns={[
            { heading: t('Time'), sort: entry => Date.parse(entry.at), cell: entry => date(entry.at, true) },
            { heading: t('Team member'), sort: entry => entry.who, cell: entry => entry.who },
            { heading: t('Action'), sort: entry => t(entry.action), cell: entry => t(entry.action) },
            { heading: t('Target'), sort: entry => t(entry.target), cell: entry => <span className="team-audit-target">{t(entry.target)}</span> },
            { heading: t('Reason'), sort: entry => entry.reason ?? '', cell: entry => entry.reason || '—' },
          ]}
        />
      </Card>
    </div>
  )
}
