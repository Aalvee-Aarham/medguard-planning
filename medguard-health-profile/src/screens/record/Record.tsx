import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Activity, AlertTriangle, FileImage, FileText, FlaskConical, HeartPulse, History, Pill, Scissors, Stethoscope, Syringe, Trash2, Users, type LucideIcon,
} from 'lucide-react'
import { useApp, uid } from '../../state/store'
import { useT } from '../../i18n'
import { Avatar, Button, Card, Input, List, ListRow, Note, PageHeader, Screen, SectionTitle, Textarea } from '../../components/ui'
import { AllergyStrip, SourceLabel } from '../../components/status'
import { ConfirmDialog } from '../../components/overlays'
import { NoAccess } from '../../components/states'
import { age, fmtDate } from '../../lib/format'
import type { RecordSection } from '../../mock/types'

export const SECTIONS: { key: RecordSection; label: string; icon: LucideIcon }[] = [
  { key: 'conditions', label: 'Conditions', icon: HeartPulse },
  { key: 'medicines', label: 'Current medicines', icon: Pill },
  { key: 'tests', label: 'Test results', icon: FlaskConical },
  { key: 'imaging', label: 'Imaging', icon: FileImage },
  { key: 'prescriptions', label: 'Prescriptions', icon: FileText },
  { key: 'vitals', label: 'Vitals', icon: Activity },
  { key: 'surgeries', label: 'Surgeries and admissions', icon: Scissors },
  { key: 'vaccinations', label: 'Vaccinations', icon: Syringe },
  { key: 'lifestyle', label: 'Family and lifestyle', icon: Users },
  { key: 'doctors', label: 'Doctors seen', icon: Stethoscope },
]

/** Header: photo, name, age, sex, blood group + allergy strip. Used by H26 and J4. */
export function RecordHeader({ profileId }: { profileId: string }) {
  const { s } = useApp()
  const t = useT()
  const p = s.profiles.find((x) => x.id === profileId)!
  return (
    <>
      <Card className="flex items-center gap-4">
        <Avatar name={p.name} size={64} />
        <div className="min-w-0">
          <p className="text-h3 font-semibold">{p.name}</p>
          <p className="text-body text-ink-700 tabular">
            {age(p.dob)} {t('years')} · {t(p.sex === 'female' ? 'Female' : p.sex === 'male' ? 'Male' : 'Other')}
            {p.bloodGroup && <> · {t('Blood')} <span className="font-semibold text-ink-900">{p.bloodGroup}</span></>}
          </p>
        </div>
      </Card>
      <div className="mt-3">
        <AllergyStrip profileId={profileId} />
      </div>
    </>
  )
}

/** H30 Edit item + change history */
export function EditItem() {
  const { id } = useParams()
  const { s, mutate, toast, can, queueIfOffline } = useApp()
  const t = useT()
  const nav = useNavigate()
  const item = s.items.find((x) => x.id === id)
  const [title, setTitle] = useState(item?.title ?? '')
  const [detail, setDetail] = useState(item?.detail ?? '')
  if (!item) return <Screen><PageHeader title={t('Not found')} /></Screen>
  if (!can('edit'))
    return (
      <Screen>
        <PageHeader title={item.title} />
        <NoAccess owner={s.account.name} />
      </Screen>
    )
  return (
    <Screen>
      <PageHeader title={t('Edit item')} />
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          const now = new Date().toISOString()
          mutate((d) => {
            const x = d.items.find((y) => y.id === item.id)!
            x.history = x.history ?? []
            if (x.title !== title) x.history.unshift({ by: 'you', at: now, field: 'Name', from: x.title, to: title })
            if ((x.detail ?? '') !== detail) x.history.unshift({ by: 'you', at: now, field: 'Details', from: x.detail ?? '—', to: detail })
            x.title = title
            x.detail = detail
          })
          toast(queueIfOffline('Edit item') ? t('Saved on this phone. Will sync when online.') : t('Changes saved'))
          nav(-1)
        }}
      >
        <Input label={t('Name')} value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea label={t('Details')} value={detail} onChange={(e) => setDetail(e.target.value)} />
        <SourceLabel source={item.source} />
        <Button full type="submit">
          {t('Save changes')}
        </Button>
      </form>
      <SectionTitle>{t('Change history')}</SectionTitle>
      {item.history?.length ? (
        <List>
          {item.history.map((h, i) => (
            <ListRow key={i} icon={History} iconTone="neutral" title={`${t(h.field)}: ${h.from} → ${h.to}`} sub={`${h.by === 'you' ? t('You') : h.by}, ${fmtDate(h.at)}`} />
          ))}
        </List>
      ) : (
        <p className="text-body text-ink-700">{t('No changes yet.')}</p>
      )}
    </Screen>
  )
}

/** H32 Admission detail + H33 delete dialog */
export function AdmissionDetail() {
  const { id } = useParams()
  const { s, mutate, toast, can } = useApp()
  const t = useT()
  const nav = useNavigate()
  const [del, setDel] = useState(false)
  const a = s.admissions.find((x) => x.id === id)
  if (!a) return <Screen><PageHeader title={t('Not found')} /></Screen>
  return (
    <Screen>
      <PageHeader title={a.hospital} sub={`${a.ward} · ${a.bed}`} />
      <Card>
        <p className="text-small text-ink-700">{t('Stay')}</p>
        <p className="font-semibold tabular">
          {fmtDate(a.from)} – {a.to ? fmtDate(a.to) : t('now')}
        </p>
        <SourceLabel source={a.source} className="mt-2" />
      </Card>
      <SectionTitle>{t('Discharge summary')}</SectionTitle>
      <Card>
        <p className="text-body">{a.summary}</p>
      </Card>
      <SectionTitle>{t('Medicines from this stay')}</SectionTitle>
      <List>
        {a.medicines.map((m) => (
          <ListRow key={m} icon={Pill} title={m} />
        ))}
      </List>
      {a.results.length > 0 && (
        <>
          <SectionTitle>{t('Results from this stay')}</SectionTitle>
          <List>
            {a.results.map((r) => (
              <ListRow key={r} icon={FlaskConical} title={r} />
            ))}
          </List>
        </>
      )}
      {can('delete') && (
        <Button full variant="tertiary" icon={Trash2} className="mt-6 text-danger-text" onClick={() => setDel(true)}>
          {t('Delete hospital record')}
        </Button>
      )}
      <ConfirmDialog
        open={del}
        onClose={() => setDel(false)}
        title={t('Delete this hospital record?')}
        body={
          <Note tone="warning" icon={AlertTriangle}>
            {t('Doctors may rely on this stay record. {h} keeps its own copy.', { h: a.hospital })}
          </Note>
        }
        reason={t('Reason')}
        confirmLabel={t('Delete record')}
        destructive
        onConfirm={(reason) => {
          mutate((d) => {
            d.admissions = d.admissions.filter((x) => x.id !== a.id)
            d.accessLog.unshift({ id: uid('l'), profileId: a.profileId, who: t('You'), action: 'edited', at: new Date().toISOString(), reason: reason || 'Deleted hospital record' })
          })
          toast(t('Hospital record deleted'))
          nav('/record', { replace: true })
        }}
      />
    </Screen>
  )
}
