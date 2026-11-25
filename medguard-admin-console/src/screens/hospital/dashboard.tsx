import { useState } from 'react'
import { BedDouble, Building2, Download, ShieldAlert, UsersRound, Video } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, DataTable, EmptyState, Field, Notice, PageHeader, ReasonDialog, StatTile, StatusChip } from '../../components'
import { useI18n } from '../../i18n'
import { type EmergencyAccess as EmergencyRecord } from '../../mock/data'
import { useHospital } from './useHospital'
import { downloadAudit, hospitalDay, taka } from './utils'

export function Overview() {
  const { t, date } = useI18n()
  const { db, hospital, hospitalId, wards, cameraOffline } = useHospital()
  const navigate = useNavigate()
  const cameras = db.cameras.filter((camera) => camera.hospitalId === hospitalId)
  const online = cameras.filter((camera) => camera.status === 'Online' && !(cameraOffline && camera.id === 'cam-02')).length
  const beds = db.beds.filter((bed) => wards.some((ward) => ward.id === bed.wardId))
  const staff = db.staff.filter((member) => member.hospitalId === hospitalId && member.status === 'Active')
  const pending = db.emergency.filter((entry) => entry.hospitalId === hospitalId && entry.status === 'Pending')
  const plan = db.plans.find((plan) => plan.id === hospital?.plan)

  return (
    <div className="stack">
      <PageHeader title={t('Hospital overview')} description={t('Manage hospital access, ward setup and compliance.')} />
      <div className="grid-4 hospital-stats">
        <StatTile label={t('Wards')} value={wards.length} icon={Building2} />
        <StatTile label={t('Beds')} value={beds.length} icon={BedDouble} />
        <StatTile label={t('Active staff')} value={staff.length} icon={UsersRound} />
        <StatTile label={t('Cameras online')} value={`${online} / ${cameras.length}`} icon={Video} />
      </div>
      <div className="grid-2 hospital-summary">
        <Card className="hospital-summary-card" title={t('Emergency access reviews')}
          actions={<Button variant="secondary" onClick={() => navigate('/hospital/emergency-access')}>{t('Open reviews')}</Button>}>
          {pending.length ? <>
            <div className="hospital-review-summary">
              <span className="hospital-review-icon"><ShieldAlert size={20} aria-hidden="true" /></span>
              <div>
                <strong>{t('{count} pending', { count: pending.length })}</strong>
                <p className="muted">{t('Emergency access is recorded and requires an admin review.')}</p>
              </div>
            </div>
            <ul className="hospital-record-list">
              {pending.slice(0, 3).map((entry) => <li key={entry.id}>
                <div><strong>{entry.patient}</strong><div className="muted">{entry.staff} · {date(entry.at, true)}</div></div>
                <StatusChip status={entry.status} />
              </li>)}
            </ul>
          </> : <p className="muted">{t('No pending emergency access reviews.')}</p>}
        </Card>
        <Card className="hospital-summary-card" title={t('Subscription')}
          actions={<Button variant="secondary" onClick={() => navigate('/hospital/subscription')}>{t('View subscription')}</Button>}>
          {plan ? <dl className="hospital-facts">
            <div><dt>{t('Current plan')}</dt><dd>{t(plan.name)}</dd></div>
            <div><dt>{t('Renews on')}</dt><dd>{hospital?.renewal ? date(hospital.renewal) : t('Not scheduled')}</dd></div>
            <div><dt>{t('Beds covered')}</dt><dd>{plan.beds}</dd></div>
            <div><dt>{t('Wards covered')}</dt><dd>{plan.wards}</dd></div>
          </dl> : <p className="muted">{t('No subscription plan is assigned.')}</p>}
        </Card>
      </div>
    </div>
  )
}

const emergencyStatuses = ['Pending', 'Reviewed', 'Escalated']

export function EmergencyAccess() {
  const { t, date } = useI18n()
  const { db, hospitalId, write } = useHospital()
  const [status, setStatus] = useState('')
  const [escalation, setEscalation] = useState<EmergencyRecord>()
  const [feedback, setFeedback] = useState('')
  const rows = db.emergency.filter((entry) => entry.hospitalId === hospitalId && (!status || entry.status === status))

  function review(entry: EmergencyRecord, status: 'Reviewed' | 'Escalated', reason?: string) {
    const patient = `${entry.patient} (#${entry.patientId})`
    write(status === 'Reviewed' ? 'Emergency access reviewed' : 'Emergency access escalated', entry.staff, (current) => ({
      ...current,
      emergency: current.emergency.map((record) => record.id === entry.id ? { ...record, status } : record),
    }), { patient, reason })
    setFeedback(status)
  }

  return (
    <div className="stack">
      <PageHeader title={t('Emergency access review')} description={t('Review every emergency access recorded at this hospital.')} />
      {feedback && <Notice tone="success">{t(feedback === 'Reviewed' ? 'Emergency access marked as reviewed.' : 'Emergency access escalated and recorded.')}</Notice>}
      <DataTable rows={rows} rowKey={(entry) => entry.id} searchLabel={t('Search access records')}
        searchText={(entry) => [entry.staff, entry.patient, entry.patientId, entry.reason, date(entry.at, true)].join(' ')}
        filters={<Field label={t('Status')}>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">{t('All statuses')}</option>
            {emergencyStatuses.map((value) => <option key={value} value={value}>{t(value)}</option>)}
          </select>
        </Field>}
        columns={[
          { heading: t('Staff'), cell: (entry) => entry.staff, sort: (entry) => entry.staff },
          { heading: t('Patient'), cell: (entry) => <><strong>{entry.patient}</strong><br /><span className="muted">#{entry.patientId}</span></>, sort: (entry) => entry.patient },
          { heading: t('Access reason'), cell: (entry) => t(entry.reason), sort: (entry) => entry.reason },
          { heading: t('Time'), cell: (entry) => date(entry.at, true), sort: (entry) => Date.parse(entry.at) },
          { heading: t('Status'), cell: (entry) => <StatusChip status={entry.status} />, sort: (entry) => t(entry.status) },
        ]}
        actions={(entry) => entry.status === 'Pending' ? [
          { label: t('Mark reviewed'), run: () => review(entry, 'Reviewed') },
          { label: t('Escalate'), run: () => setEscalation(entry), danger: true },
        ] : []}
        emptyTitle={t('No emergency access records match.')} />
      {escalation && <ReasonDialog title={t('Escalate emergency access?')}
        description={t('The escalation and your reason will be saved to the hospital audit log.')}
        confirmLabel={t('Escalate')} danger onClose={() => setEscalation(undefined)} onConfirm={(reason) => {
          review(escalation, 'Escalated', reason)
          setEscalation(undefined)
        }} />}
    </div>
  )
}

export function Audit() {
  const { t, date, language } = useI18n()
  const { db, hospitalId } = useHospital()
  const [query, setQuery] = useState('')
  const [person, setPerson] = useState('')
  const [patient, setPatient] = useState('')
  const [action, setAction] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const entries = db.audit.filter((entry) => entry.area === 'hospital' && entry.hospitalId === hospitalId)
  const dateError = from && to && from > to
  const term = query.trim().toLocaleLowerCase(language)
  const rows = entries.filter((entry) => {
    const day = hospitalDay(entry.at)
    const reason = entry.reason ? t(entry.reason) : ''
    const searchable = [entry.who, t(entry.action), entry.target, entry.patient, reason].join(' ').toLocaleLowerCase(language)
    return (!person || entry.who === person) && (!action || entry.action === action)
      && (!patient.trim() || entry.patient?.toLowerCase().includes(patient.trim().toLowerCase()))
      && (!from || day >= from) && (!to || day <= to)
      && (!term || searchable.includes(term))
  }).sort((first, second) => Date.parse(second.at) - Date.parse(first.at))
  const people = Array.from(new Set(entries.map((entry) => entry.who))).sort()
  const actions = Array.from(new Set(entries.map((entry) => entry.action))).sort((a, b) => t(a).localeCompare(t(b)))

  function exportRows() {
    downloadAudit([
      [t('Time'), t('Person'), t('Action'), t('Target'), t('Patient'), t('Reason')],
      ...rows.map((entry) => [date(entry.at, true), entry.who, t(entry.action), entry.target, entry.patient ?? '', entry.reason ? t(entry.reason) : '']),
    ])
  }

  return (
    <div className="stack">
      <PageHeader title={t('Audit log')} description={t('Trace changes and emergency access decisions for this hospital.')}
        actions={<Button variant="secondary" onClick={exportRows} disabled={!rows.length}><Download size={18} />{t('Export CSV')}</Button>} />
      <DataTable rows={rows} rowKey={(entry) => entry.id}
        filters={<>
          <Field label={t('Search audit log')}>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
          </Field>
          <Field label={t('Person')}>
            <select value={person} onChange={(event) => setPerson(event.target.value)}>
              <option value="">{t('All people')}</option>
              {people.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </Field>
          <Field label={t('Patient')}>
            <input type="search" value={patient} onChange={(event) => setPatient(event.target.value)} />
          </Field>
          <Field label={t('Action')}>
            <select value={action} onChange={(event) => setAction(event.target.value)}>
              <option value="">{t('All actions')}</option>
              {actions.map((value) => <option key={value} value={value}>{t(value)}</option>)}
            </select>
          </Field>
          <Field label={t('From date')}><input type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} /></Field>
          <Field label={t('To date')} error={dateError ? t('Select an end date on or after the start date.') : undefined}>
            <input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} />
          </Field>
        </>}
        columns={[
          { heading: t('Time'), cell: (entry) => date(entry.at, true), sort: (entry) => Date.parse(entry.at) },
          { heading: t('Person'), cell: (entry) => entry.who, sort: (entry) => entry.who },
          { heading: t('Action'), cell: (entry) => t(entry.action), sort: (entry) => entry.action },
          { heading: t('Target'), cell: (entry) => entry.target, sort: (entry) => entry.target },
          { heading: t('Patient'), cell: (entry) => entry.patient ?? '—', sort: (entry) => entry.patient ?? '' },
          { heading: t('Reason'), cell: (entry) => entry.reason ? t(entry.reason) : '—', sort: (entry) => entry.reason ?? '' },
        ]}
        emptyTitle={entries.length ? t('No audit entries match these filters.') : t('No actions have been recorded yet.')} />
    </div>
  )
}

export function Subscription() {
  const { t, date } = useI18n()
  const { db, hospital, hospitalId } = useHospital()
  const plan = db.plans.find((plan) => plan.id === hospital?.plan)
  const invoices = db.invoices.filter((invoice) => invoice.hospitalId === hospitalId)

  return (
    <div className="stack">
      <PageHeader title={t('Subscription')} description={t('Check your plan coverage and billing history.')} />
      {plan ? <Card title={t('Current plan')}>
        <dl className="hospital-facts hospital-facts-wide">
          <div><dt>{t('Plan')}</dt><dd>{t(plan.name)}</dd></div>
          <div><dt>{t('Beds covered')}</dt><dd>{plan.beds}</dd></div>
          <div><dt>{t('Wards covered')}</dt><dd>{plan.wards}</dd></div>
          <div><dt>{t('Renews on')}</dt><dd>{hospital?.renewal ? date(hospital.renewal) : t('Not scheduled')}</dd></div>
        </dl>
      </Card> : <EmptyState title={t('No subscription plan is assigned.')} />}
      <section className="stack" aria-labelledby="hospital-invoices">
        <h2 id="hospital-invoices">{t('Invoices')}</h2>
        <DataTable rows={invoices} rowKey={(invoice) => invoice.id} searchLabel={t('Search invoices')}
          searchText={(invoice) => [invoice.id, date(invoice.date), taka(invoice.amount), t(invoice.status)].join(' ')}
          columns={[
            { heading: t('Invoice'), cell: (invoice) => invoice.id, sort: (invoice) => invoice.id },
            { heading: t('Date'), cell: (invoice) => date(invoice.date), sort: (invoice) => invoice.date },
            { heading: t('Amount'), cell: (invoice) => taka(invoice.amount), sort: (invoice) => invoice.amount },
            { heading: t('Status'), cell: (invoice) => <StatusChip status={invoice.status} />, sort: (invoice) => t(invoice.status) },
          ]} emptyTitle={t('No invoices yet.')} />
      </section>
    </div>
  )
}
