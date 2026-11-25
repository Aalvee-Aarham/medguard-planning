import { useState, type FormEvent, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Button, Card, DataTable, EmptyState, Field, FormPage, Notice, PageHeader, ReasonDialog, StatusChip } from '../../components'
import { useI18n } from '../../i18n'
import { id, initialData, type Bed, type ShiftRule, type VitalConfig, type Ward } from '../../mock/data'
import { InlineForm } from './InlineForm'
import { useHospital } from './useHospital'

function useWardSelection() {
  const { wards } = useHospital()
  const [params, setParams] = useSearchParams()
  const ward = wards.find(({ id }) => id === params.get('ward')) ?? wards[0]
  function select(wardId: string) {
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.set('ward', wardId)
      return next
    }, { replace: true })
  }
  return { ward, wards, select }
}

function WardSelect({ ward, wards, select }: { ward: Ward; wards: Ward[]; select: (id: string) => void }) {
  const { t } = useI18n()
  return <Field label={t('Ward')}>
    <select value={ward.id} onChange={(event) => select(event.target.value)}>
      {wards.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
    </select>
  </Field>
}

function NoWards() {
  const { t } = useI18n()
  return <EmptyState title={t('No wards are configured for this hospital.')}
    description={t('Ask the MedGuard team to add wards for this hospital.')} />
}

const bedTypes = ['General', 'ICU', 'Observation', 'Private']

export function Beds() {
  const { t } = useI18n()
  const selection = useWardSelection()
  return selection.ward ? <BedList key={selection.ward.id} ward={selection.ward} selectWard={<WardSelect {...selection} ward={selection.ward} />} />
    : <div className="stack"><PageHeader title={t('Beds')} /><NoWards /></div>
}

function BedList({ ward, selectWard }: { ward: Ward; selectWard: ReactNode }) {
  const { t } = useI18n()
  const { db, write } = useHospital()
  const [adding, setAdding] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [confirm, setConfirm] = useState<Bed>()
  const [feedback, setFeedback] = useState<{ message: string; name: string }>()
  const rooms = db.rooms.filter((room) => room.wardId === ward.id)
  const beds = db.beds.filter((bed) => bed.wardId === ward.id)
  const rows = beds.filter((bed) => (!typeFilter || bed.type === typeFilter)
    && (!statusFilter || bed.outOfService === (statusFilter === 'Out of service')))
  const roomName = (bed: Bed) => t(rooms.find((room) => room.id === bed.roomId)?.name ?? 'Unassigned')

  function updateStatus(bed: Bed, outOfService: boolean, reason?: string) {
    write(outOfService ? 'Bed marked out of service' : 'Bed returned to service', `${ward.name} · ${bed.name}`, (current) => ({
      ...current,
      beds: current.beds.map((record) => record.id === bed.id ? { ...record, outOfService } : record),
    }), { reason })
    setFeedback({ message: outOfService ? '{name} was marked out of service.' : '{name} was returned to service.', name: bed.name })
  }

  return (
    <div className="stack">
      <PageHeader title={t('Beds')} description={t('Manage the beds and room assignments in each ward.')}
        actions={!adding && <Button onClick={() => setAdding(true)}><Plus size={18} />{t('Add bed')}</Button>} />
      {feedback && <Notice tone="success">{t(feedback.message, { name: feedback.name })}</Notice>}
      {adding && <BedForm ward={ward} beds={beds} rooms={rooms} onClose={() => setAdding(false)} onAdd={(name) => {
        setAdding(false)
        setFeedback({ message: '{name} was added.', name })
      }} />}
      <DataTable rows={rows} rowKey={(bed) => bed.id} searchLabel={t('Search beds')}
        searchText={(bed) => [bed.name, roomName(bed), t(bed.type), t(bed.outOfService ? 'Out of service' : 'In service')].join(' ')}
        filters={<>
          {selectWard}
          <Field label={t('Bed type')}>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="">{t('All bed types')}</option>
              {bedTypes.map((type) => <option key={type} value={type}>{t(type)}</option>)}
            </select>
          </Field>
          <Field label={t('Status')}>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">{t('All statuses')}</option>
              <option value="In service">{t('In service')}</option>
              <option value="Out of service">{t('Out of service')}</option>
            </select>
          </Field>
        </>}
        columns={[
          { heading: t('Bed'), cell: (bed) => <strong>{bed.name}</strong>, sort: (bed) => bed.name },
          { heading: t('Room'), cell: roomName, sort: roomName },
          { heading: t('Bed type'), cell: (bed) => t(bed.type), sort: (bed) => t(bed.type) },
          { heading: t('Status'), cell: (bed) => <StatusChip status={bed.outOfService ? 'Out of service' : 'In service'} />,
            sort: (bed) => Number(bed.outOfService) },
        ]}
        actions={(bed) => bed.outOfService ? [{ label: t('Return to service'), run: () => updateStatus(bed, false) }]
          : [{ label: t('Mark out of service'), run: () => setConfirm(bed), danger: true }]}
        emptyTitle={beds.length ? t('No beds match these filters.') : t('No beds in this ward yet.')}
        emptyAction={!beds.length && !adding ? <Button variant="secondary" onClick={() => setAdding(true)}>{t('Add bed')}</Button> : undefined} />
      {confirm && <ReasonDialog title={t('Mark {name} out of service?', { name: confirm.name })}
        description={t('This bed will be unavailable for allocation until returned to service.')}
        confirmLabel={t('Mark out of service')} danger onClose={() => setConfirm(undefined)} onConfirm={(reason) => {
          updateStatus(confirm, true, reason)
          setConfirm(undefined)
        }} />}
    </div>
  )
}

function BedForm({ ward, beds, rooms, onClose, onAdd }: {
  ward: Ward; beds: Bed[]; rooms: { id: string; name: string }[]; onClose: () => void; onAdd: (name: string) => void
}) {
  const { t } = useI18n()
  const { write } = useHospital()
  const [name, setName] = useState('')
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? '')
  const [type, setType] = useState('General')
  const [error, setError] = useState('')
  const initialRoomId = rooms[0]?.id ?? ''

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const label = name.trim()
    if (!label) return setError('Enter a bed name or number.')
    if (beds.some((bed) => bed.name.trim().toLowerCase() === label.toLowerCase())) return setError('A bed with this name already exists in this ward.')
    const room = rooms.length ? undefined : { id: id('room'), wardId: ward.id, name: 'General room' }
    const bed: Bed = { id: id('bed'), wardId: ward.id, roomId: room?.id ?? roomId, name: label, type, outOfService: false }
    write('Bed added', `${ward.name} · ${label}`, (current) => ({
      ...current, rooms: room ? [...current.rooms, room] : current.rooms, beds: [...current.beds, bed],
    }))
    onAdd(label)
  }

  return <InlineForm onSubmit={save} dirty={Boolean(name || roomId !== initialRoomId || type !== 'General')}
    onCancel={onClose} saveLabel={t('Save bed')}>
    <Card title={t('Add bed')} description={ward.name}>
      <div className="grid-3">
        <Field label={t('Bed name or number')} error={error ? t(error) : undefined}>
          <input autoFocus maxLength={60} value={name} onChange={(event) => { setName(event.target.value); setError('') }} />
        </Field>
        <Field label={t('Bed type')}>
          <select value={type} onChange={(event) => setType(event.target.value)}>
            {bedTypes.map((value) => <option key={value} value={value}>{t(value)}</option>)}
          </select>
        </Field>
        <Field label={t('Room')}>
          {rooms.length ? <select value={roomId} onChange={(event) => setRoomId(event.target.value)}>
            {rooms.map(({ id, name }) => <option key={id} value={id}>{t(name)}</option>)}
          </select> : <input value={t('General room')} readOnly />}
        </Field>
      </div>
    </Card>
  </InlineForm>
}

const shiftTimes = [
  { label: 'Morning', start: 'morningStart', end: 'morningEnd' },
  { label: 'Evening', start: 'eveningStart', end: 'eveningEnd' },
  { label: 'Night', start: 'nightStart', end: 'nightEnd' },
] as const

export function ShiftRules() {
  const { t } = useI18n()
  const selection = useWardSelection()
  return <div className="stack">
    <PageHeader title={t('Shift rules')} description={t('Set each ward’s shifts, nurse-to-patient ratio and minimum rest.')}/>
    {selection.ward ? <>
      <div className="hospital-ward-control"><WardSelect {...selection} ward={selection.ward} /></div>
      <ShiftEditor key={selection.ward.id} ward={selection.ward} />
    </> : <NoWards />}
  </div>
}

type ShiftDraft = Omit<ShiftRule, 'ratio' | 'rest'> & { ratio: string; rest: string }

function ShiftEditor({ ward }: { ward: Ward }) {
  const { t } = useI18n()
  const { db, write } = useHospital()
  const rule = db.shifts.find(({ wardId }) => wardId === ward.id)
  const initial: ShiftDraft = rule ? { ...rule, ratio: String(rule.ratio), rest: String(rule.rest) } : {
    wardId: ward.id, morningStart: '08:00', morningEnd: '14:00', eveningStart: '14:00', eveningEnd: '20:00',
    nightStart: '20:00', nightEnd: '08:00', ratio: '', rest: '',
  }
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<Partial<Record<keyof ShiftDraft, string>>>({})
  const [saved, setSaved] = useState(false)

  function change(key: keyof ShiftDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    setSaved(false)
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: typeof errors = {}
    for (const { start, end } of shiftTimes) {
      if (!draft[start]) next[start] = 'Enter a start time.'
      if (!draft[end]) next[end] = 'Enter an end time.'
      else if (draft[start] === draft[end]) next[end] = 'Choose an end time different from the start time.'
    }
    const ratio = Number(draft.ratio)
    const rest = Number(draft.rest)
    if (!Number.isSafeInteger(ratio) || ratio < 1) next.ratio = 'Enter a positive whole number of patients per nurse.'
    if (!draft.rest.trim() || !Number.isFinite(rest) || rest < 0 || rest > 24) next.rest = 'Enter a rest period between 0 and 24 hours.'
    setErrors(next)
    if (Object.keys(next).length) return
    write('Shift rules updated', ward.name, (current) => ({
      ...current,
      shifts: [...current.shifts.filter(({ wardId }) => wardId !== ward.id), { ...draft, ratio, rest }],
    }))
    setDraft({ ...draft, ratio: String(ratio), rest: String(rest) })
    setSaved(true)
  }

  return <>
    {saved && <Notice tone="success">{t('Shift rules saved.')}</Notice>}
    <FormPage onSubmit={save} dirty={JSON.stringify(draft) !== JSON.stringify(initial)} saveLabel={t('Save shift rules')}>
      <Card title={t('Shift pattern')} description={t('Night shifts can end the following morning.')}>
        <div className="stack">
          {shiftTimes.map(({ label, start, end }) => <fieldset className="hospital-fieldset" key={label}>
            <legend>{t(label)}</legend>
            <div className="grid-2">
              <Field label={t('{shift} start', { shift: t(label) })} error={errors[start] ? t(errors[start]) : undefined}>
                <input type="time" value={draft[start]} onChange={(event) => change(start, event.target.value)} />
              </Field>
              <Field label={t('{shift} end', { shift: t(label) })} error={errors[end] ? t(errors[end]) : undefined}>
                <input type="time" value={draft[end]} onChange={(event) => change(end, event.target.value)} />
              </Field>
            </div>
          </fieldset>)}
        </div>
      </Card>
      <Card title={t('Staffing requirements')}>
        <div className="grid-2">
          <Field label={t('Patients per nurse')} hint={t('Ratio: 1 nurse to {count} patients', { count: draft.ratio || '—' })}
            error={errors.ratio ? t(errors.ratio) : undefined}>
            <input inputMode="numeric" value={draft.ratio} onChange={(event) => change('ratio', event.target.value)} />
          </Field>
          <Field label={t('Minimum rest hours')} error={errors.rest ? t(errors.rest) : undefined}>
            <input inputMode="decimal" value={draft.rest} onChange={(event) => change('rest', event.target.value)} />
          </Field>
        </div>
      </Card>
    </FormPage>
  </>
}

export function Vitals() {
  const { t } = useI18n()
  const selection = useWardSelection()
  return <div className="stack">
    <PageHeader title={t('Vitals setup')} description={t('Choose the vitals recorded in each ward and set their normal ranges.')} />
    {selection.ward ? <>
      <div className="hospital-ward-control"><WardSelect {...selection} ward={selection.ward} /></div>
      <VitalsEditor key={selection.ward.id} ward={selection.ward} />
    </> : <NoWards />}
  </div>
}

type VitalDraft = Omit<VitalConfig, 'min' | 'max'> & { min: string; max: string }
type RangeErrors = Partial<Record<'min' | 'max', string>>

function VitalsEditor({ ward }: { ward: Ward }) {
  const { t } = useI18n()
  const { db, write } = useHospital()
  const existing = db.vitals.filter(({ wardId }) => wardId === ward.id)
  const defaults = initialData.vitals.filter(({ wardId }) => wardId === initialData.wards[0]?.id)
  const initial: VitalDraft[] = [...existing, ...defaults.filter((value) => !existing.some(({ key }) => key === value.key))]
    .map((value) => ({ ...value, wardId: ward.id, min: String(value.min), max: String(value.max) }))
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<Record<string, RangeErrors>>({})
  const [saved, setSaved] = useState(false)

  function change<K extends 'min' | 'max' | 'enabled'>(key: string, field: K, value: VitalDraft[K]) {
    setDraft((current) => current.map((vital) => vital.key === key ? { ...vital, [field]: value } : vital))
    setErrors((current) => ({ ...current, [key]: {} }))
    setSaved(false)
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: typeof errors = {}
    const vitals = draft.map((vital): VitalConfig => {
      const min = Number(vital.min)
      const max = Number(vital.max)
      const limits: RangeErrors = {}
      if (!vital.min.trim() || !Number.isFinite(min)) limits.min = 'Enter a valid minimum.'
      if (!vital.max.trim() || !Number.isFinite(max)) limits.max = 'Enter a valid maximum.'
      else if (max < min) limits.max = 'Enter a maximum at or above the minimum.'
      if (Object.keys(limits).length) next[vital.key] = limits
      return { ...vital, min, max }
    })
    setErrors(next)
    if (Object.keys(next).length) return
    write('Vitals configuration updated', ward.name, (current) => ({
      ...current, vitals: [...current.vitals.filter(({ wardId }) => wardId !== ward.id), ...vitals],
    }))
    setDraft(vitals.map((value) => ({ ...value, min: String(value.min), max: String(value.max) })))
    setSaved(true)
  }

  return <>
    {saved && <Notice tone="success">{t('Vitals configuration saved.')}</Notice>}
    <FormPage onSubmit={save} dirty={JSON.stringify(initial) !== JSON.stringify(draft)} saveLabel={t('Save vitals')}>
      <Card title={t('Recorded vitals and normal ranges')}>
        <div className="hospital-vital-grid">
          {draft.map((vital) => {
            const { min, max } = errors[vital.key] ?? {}
            const name = t(vital.name)
            return <fieldset key={vital.key} aria-label={name} className="hospital-vital-row">
              <label className="check-row"><input type="checkbox" checked={vital.enabled}
                onChange={(event) => change(vital.key, 'enabled', event.target.checked)} />{name}</label>
              <Field label={t('Minimum')} error={min ? t(min) : undefined}>
                <input inputMode="decimal" aria-label={`${name}, ${t('Minimum')}`} value={vital.min}
                  onChange={(event) => change(vital.key, 'min', event.target.value)} />
              </Field>
              <Field label={t('Maximum')} error={max ? t(max) : undefined}>
                <input inputMode="decimal" aria-label={`${name}, ${t('Maximum')}`} value={vital.max}
                  onChange={(event) => change(vital.key, 'max', event.target.value)} />
              </Field>
              <span className="hospital-vital-unit" aria-label={t('Unit')}>{t(vital.unit)}</span>
            </fieldset>
          })}
        </div>
      </Card>
    </FormPage>
  </>
}
