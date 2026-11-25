import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { ImageUp, Plus } from 'lucide-react'
import { Button, Card, DataTable, EmptyState, Field, FormPage, Notice, PageHeader } from '../../components'
import { useI18n } from '../../i18n'
import { id, type Drug, type Hospital } from '../../mock/data'
import { InlineForm } from './InlineForm'
import { useHospital } from './useHospital'

export function Formulary() {
  const { t } = useI18n()
  const { db, hospitalId } = useHospital()
  const [source, setSource] = useState('')
  const [editor, setEditor] = useState<Drug | 'new'>()
  const [feedback, setFeedback] = useState('')
  const available = db.drugs.filter((drug) => drug.source === 'base' || drug.hospitalId === hospitalId)
  const rows = available.filter((drug) => !source || drug.source === source)
  const sourceName = (drug: Drug) => t(drug.source === 'base' ? 'MedGuard base' : 'Hospital addition')

  return (
    <div className="stack">
      <PageHeader title={t('Formulary additions')} description={t('Add local drugs to the MedGuard base formulary.')}
        actions={!editor && <Button onClick={() => setEditor('new')}><Plus size={18} />{t('Add drug')}</Button>} />
      {feedback && <Notice tone="success">{t(feedback)}</Notice>}
      {editor && <DrugEditor key={editor === 'new' ? editor : editor.id} drug={editor === 'new' ? undefined : editor}
        available={available} onClose={() => setEditor(undefined)} onSaved={(isEdit) => {
          if (source === 'base') setSource('hospital')
          setEditor(undefined)
          setFeedback(isEdit ? 'Drug changes saved.' : 'Drug added to the hospital formulary.')
        }} />}
      <DataTable rows={rows} rowKey={(drug) => drug.id} searchLabel={t('Search drugs')}
        searchText={(drug) => [drug.brand, drug.generic, drug.strength, t(drug.form), sourceName(drug)].join(' ')}
        filters={<Field label={t('Source')}>
          <select value={source} onChange={(event) => setSource(event.target.value)}>
            <option value="">{t('All sources')}</option>
            <option value="base">{t('MedGuard base')}</option>
            <option value="hospital">{t('Hospital addition')}</option>
          </select>
        </Field>}
        columns={[
          { heading: t('Brand'), cell: (drug) => <strong>{drug.brand}</strong>, sort: (drug) => drug.brand },
          { heading: t('Generic name'), cell: (drug) => <strong>{drug.generic}</strong>, sort: (drug) => drug.generic },
          { heading: t('Strength'), cell: (drug) => drug.strength, sort: (drug) => drug.strength },
          { heading: t('Form'), cell: (drug) => t(drug.form), sort: (drug) => t(drug.form) },
          { heading: t('Source'), cell: sourceName, sort: sourceName },
        ]}
        actions={editor ? undefined : (drug) => drug.source === 'hospital' ? [{ label: t('Edit drug'), run: () => setEditor(drug) }] : []}
        emptyTitle={source === 'hospital' ? t('No hospital additions yet.') : t('No drugs match these filters.')}
        emptyAction={!editor && source === 'hospital' && !rows.length
          ? <Button variant="secondary" onClick={() => setEditor('new')}>{t('Add drug')}</Button> : undefined} />
    </div>
  )
}

type DrugFields = Pick<Drug, 'brand' | 'generic' | 'strength' | 'form'>
const drugFields = [
  { key: 'brand', label: 'Brand', error: 'Enter a brand name.' },
  { key: 'generic', label: 'Generic name', error: 'Enter a generic name.' },
  { key: 'strength', label: 'Strength', error: 'Enter a strength with its unit.' },
  { key: 'form', label: 'Form', error: 'Enter the drug form.' },
] as const

function DrugEditor({ drug, available, onClose, onSaved }: {
  drug?: Drug; available: Drug[]; onClose: () => void; onSaved: (isEdit: boolean) => void
}) {
  const { t } = useI18n()
  const { hospitalId, write } = useHospital()
  const initial: DrugFields = { brand: drug?.brand ?? '', generic: drug?.generic ?? '', strength: drug?.strength ?? '', form: drug?.form ?? '' }
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<Partial<Record<keyof DrugFields, string>>>({})

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: typeof errors = {}
    for (const { key, error } of drugFields) {
      if (!draft[key].trim()) next[key] = error
    }
    const identityFields = ['brand', 'strength', 'form'] as const
    if (available.some((item) => item.id !== drug?.id && identityFields.every((key) => (
      item[key].trim().toLowerCase() === draft[key].trim().toLowerCase()
    )))) next.brand = 'This brand, strength and form are already listed.'
    setErrors(next)
    if (Object.keys(next).length) return

    const record: Drug = {
      id: drug?.id ?? id('drug'), hospitalId, source: 'hospital', brand: draft.brand.trim(), generic: draft.generic.trim(),
      strength: draft.strength.trim(), form: draft.form.trim(),
    }
    write(drug ? 'Hospital drug updated' : 'Hospital drug added', record.brand, (current) => ({
      ...current,
      drugs: drug ? current.drugs.map((item) => item.id === drug.id ? record : item) : [...current.drugs, record],
    }))
    onSaved(Boolean(drug))
  }

  return <InlineForm onSubmit={save} dirty={JSON.stringify(initial) !== JSON.stringify(draft)} onCancel={onClose} saveLabel={t('Save drug')}>
    <Card title={t(drug ? 'Edit drug' : 'Add drug')}>
      <div className="grid-2">
        {drugFields.map(({ key, label }) => <Field key={key} label={t(label)} error={errors[key] ? t(errors[key]) : undefined}>
          <input autoFocus={key === 'brand'} maxLength={100} value={draft[key]} onChange={(event) => {
            setDraft((current) => ({ ...current, [key]: event.target.value }))
            setErrors((current) => ({ ...current, [key]: undefined, brand: undefined }))
          }} />
        </Field>)}
      </div>
    </Card>
  </InlineForm>
}

export function Settings() {
  const { t } = useI18n()
  const { hospital } = useHospital()
  return <div className="stack">
    <PageHeader title={t('Hospital settings')} description={t('Manage the hospital profile, consent text and retention information.')} />
    {hospital ? <SettingsEditor key={hospital.id} hospital={hospital} /> : <EmptyState title={t('Hospital profile unavailable')} />}
  </div>
}

type SettingsDraft = Pick<Hospital, 'name' | 'address' | 'logo' | 'consentEn' | 'consentBn'>
const allowedLogoTypes = ['image/png', 'image/jpeg', 'image/webp']
const maxLogoSize = 512 * 1024

function SettingsEditor({ hospital }: { hospital: Hospital }) {
  const { t } = useI18n()
  const { write } = useHospital()
  const initial: SettingsDraft = { name: hospital.name, address: hospital.address, logo: hospital.logo, consentEn: hospital.consentEn, consentBn: hospital.consentBn }
  const [draft, setDraft] = useState(initial)
  const [nameError, setNameError] = useState(false)
  const [logoError, setLogoError] = useState('')
  const [saved, setSaved] = useState(false)
  const reader = useRef<FileReader | null>(null)

  useEffect(() => () => reader.current?.abort(), [])

  function change(key: keyof SettingsDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }))
    if (key === 'name') setNameError(false)
    setSaved(false)
  }

  function pickLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    reader.current?.abort()
    if (!allowedLogoTypes.includes(file.type) || file.size > maxLogoSize) {
      setLogoError('Choose a PNG, JPEG or WebP image up to 512 KB.')
      return
    }

    const upload = new FileReader()
    reader.current = upload
    setLogoError('')
    upload.addEventListener('load', () => {
      if (typeof upload.result === 'string') change('logo', upload.result)
    })
    upload.addEventListener('error', () => setLogoError('The image could not be read. Choose another file.'))
    upload.readAsDataURL(file)
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.name.trim()) {
      setNameError(true)
      return
    }
    if (reader.current?.readyState === FileReader.LOADING) return
    const next = { ...draft, name: draft.name.trim(), address: draft.address.trim(), consentEn: draft.consentEn.trim(), consentBn: draft.consentBn.trim() }
    write('Hospital settings updated', next.name, (current) => ({
      ...current,
      hospitals: current.hospitals.map((item) => item.id === hospital.id ? { ...item, ...next } : item),
    }))
    setDraft(next)
    setSaved(true)
  }

  return <>
    {saved && <Notice tone="success">{t('Hospital settings saved.')}</Notice>}
    <FormPage onSubmit={save} dirty={JSON.stringify(draft) !== JSON.stringify(initial)} saveLabel={t('Save settings')}>
      <Card title={t('Hospital profile')}>
        <div className="stack">
          <div className="grid-2">
            <Field label={t('Hospital name')} error={nameError ? t('Enter the hospital name.') : undefined}>
              <input maxLength={150} value={draft.name} onChange={(event) => change('name', event.target.value)} />
            </Field>
            <Field label={t('Address')}>
              <input maxLength={240} value={draft.address} onChange={(event) => change('address', event.target.value)} />
            </Field>
          </div>
          <div className="hospital-logo-control">
            <div className="hospital-logo-preview">{draft.logo ? <img src={draft.logo} alt={t('Hospital logo')} /> : <ImageUp size={24} aria-hidden="true" />}</div>
            <Field label={t('Hospital logo')} hint={t('PNG, JPEG or WebP up to 512 KB.')} error={logoError ? t(logoError) : undefined}>
              <input type="file" accept={allowedLogoTypes.join(',')} onChange={pickLogo} />
            </Field>
            {draft.logo && <Button variant="ghost" type="button" onClick={() => {
              reader.current?.abort()
              setLogoError('')
              change('logo', '')
            }}>{t('Remove logo')}</Button>}
          </div>
        </div>
      </Card>
      <Card title={t('Consent form text')} description={t('Provide the consent wording used during ward admission.')}>
        <div className="grid-2">
          <Field label={t('Consent in Bangla')}>
            <textarea lang="bn" rows={5} maxLength={4000} value={draft.consentBn} onChange={(event) => change('consentBn', event.target.value)} />
          </Field>
          <Field label={t('Consent in English')}>
            <textarea lang="en" rows={5} maxLength={4000} value={draft.consentEn} onChange={(event) => change('consentEn', event.target.value)} />
          </Field>
        </div>
      </Card>
      <Card title={t('Data retention')}>
        <dl className="hospital-facts hospital-facts-wide">
          <div><dt>{t('Hospital stay records')}</dt><dd>{t('Retained by the hospital according to applicable law.')}</dd></div>
          <div><dt>{t('Camera records')}</dt><dd>{t('Camera events are retained. Video storage is disabled.')}</dd></div>
        </dl>
      </Card>
    </FormPage>
  </>
}
