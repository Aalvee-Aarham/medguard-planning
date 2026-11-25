import { useState, type FormEvent } from 'react'
import { BedDouble, Building2, DoorOpen, Layers3, Plus, Video } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, DataTable, EmptyState, Field, FormPage, PageHeader, StatusChip } from '../../components'
import { useI18n } from '../../i18n'
import { id } from '../../mock/data'
import { useMock } from '../../mock/store'
import { bedTypes, cameraStatus, mappingPath, roomBeds, sameName, teamPath } from './utils'
import './team.css'

type Draft = {
  kind: 'ward' | 'room' | 'bed'
  parent: string
  recordId?: string
  name: string
  type: string
  count: string
}

const addLabel = { ward: 'Add ward', room: 'Add room', bed: 'Add bed' }
const renameLabel = { ward: 'Rename ward', room: 'Rename room', bed: 'Rename bed' }
const nameLabel = { ward: 'Ward name', room: 'Room name', bed: 'Bed name' }
const addAction = { ward: 'Added ward', room: 'Added room', bed: 'Added bed' }
const renameAction = { ward: 'Renamed ward', room: 'Renamed room', bed: 'Renamed bed' }

export function Structure() {
  const { id: hospitalId = '' } = useParams()
  return <StructurePage key={hospitalId} hospitalId={hospitalId} />
}

function StructurePage({ hospitalId }: { hospitalId: string }) {
  const { db, write } = useMock()
  const { t } = useI18n()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [errors, setErrors] = useState<{ name?: string; count?: string }>({})
  const hospital = db.hospitals.find(item => item.id === hospitalId)
  const wards = db.wards.filter(ward => ward.hospitalId === hospitalId)
  const room = draft?.kind === 'bed' ? db.rooms.find(item => item.id === draft.parent) : undefined
  const wardBeds = room ? db.beds.filter(bed => bed.wardId === room.wardId) : []
  const nextBedNumber = 1 + wardBeds.reduce((last, bed) => {
    const match = /^Bed (\d+)$/i.exec(bed.name)
    return match ? Math.max(last, Number(match[1])) : last
  }, 0)
  const multiBed = draft?.kind === 'bed' && !draft.recordId && Number(draft.count) > 1

  if (!hospital) return <HospitalMissing />

  function open(kind: Draft['kind'], parent: string, record?: { id: string; name: string; type?: string }) {
    setErrors({})
    setDraft({ kind, parent, recordId: record?.id, name: record?.name ?? '', type: record?.type ?? 'General', count: '1' })
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft) return
    const { kind, parent, recordId, type } = draft
    const name = draft.name.trim()
    const count = kind === 'bed' && !recordId ? Number(draft.count) : 1
    const matches = (item: { id: string; name: string }) => item.id !== recordId && sameName(item.name, name)
    const duplicate = {
      ward: wards.some(matches),
      room: db.rooms.some(item => item.wardId === parent && matches(item)),
      bed: wardBeds.some(matches),
    }[kind]
    if (!Number.isInteger(count) || count < 1 || count > 100) {
      setErrors({ count: t('Enter a whole number from 1 to 100.') })
      return
    }
    if (count === 1 && (!name || duplicate)) {
      setErrors({ name: t(duplicate ? 'This name is already in use here.' : 'Enter a name to continue.') })
      return
    }
    if (recordId) {
      write(renameAction[kind], name, current => {
        if (kind === 'ward') return { ...current, wards: current.wards.map(item => item.id === recordId ? { ...item, name } : item) }
        if (kind === 'room') return { ...current, rooms: current.rooms.map(item => item.id === recordId ? { ...item, name } : item) }
        return { ...current, beds: current.beds.map(item => item.id === recordId ? { ...item, name } : item) }
      }, { hospitalId })
    } else if (kind === 'ward') {
      const ward = { id: id('ward'), hospitalId, name }
      write(addAction.ward, name, current => ({ ...current, wards: [...current.wards, ward] }), { hospitalId })
    } else if (kind === 'room') {
      const newRoom = { id: id('room'), wardId: parent, name }
      write(addAction.room, name, current => ({ ...current, rooms: [...current.rooms, newRoom] }), { hospitalId })
    } else if (room) {
      const beds = Array.from({ length: count }, (_, index) => ({
        id: id('bed'),
        wardId: room.wardId,
        roomId: room.id,
        name: count === 1 ? name : `Bed ${nextBedNumber + index}`,
        type,
        outOfService: false,
      }))
      const target = count === 1 ? name : `${beds[0].name} – ${beds[count - 1].name}`
      write(count === 1 ? addAction.bed : 'Added beds', target, current => ({ ...current, beds: [...current.beds, ...beds] }), { hospitalId })
    }
    setDraft(null)
  }

  const formHeading = draft ? t((draft.recordId ? renameLabel : draft.kind === 'bed' && multiBed ? { ...addLabel, bed: 'Add beds' } : addLabel)[draft.kind]) : ''
  return (
    <div className="stack">
      <PageHeader
        title={t('Wards and rooms')}
        description={hospital.name}
        actions={<Link to={teamPath(hospital.id, 'cameras')}>{t('Manage cameras')}</Link>}
      />
      {draft && (
        <FormPage
          onSubmit={submit}
          dirty={draft.name !== '' || draft.count !== '1' || draft.type !== 'General'}
          onCancel={() => setDraft(null)}
          saveLabel={draft.recordId ? t('Save name') : formHeading}
        >
          <Card title={formHeading}>
            <div className="team-form-fields">
              {draft.kind === 'bed' && !draft.recordId && (
                <Field label={t('Number of beds')} error={errors.count} hint={t('Multiple beds are named in numerical order.')}>
                  <input type="number" step="1" min="1" max="100" value={draft.count} onChange={event => { setDraft({ ...draft, count: event.target.value }); setErrors({}) }} />
                </Field>
              )}
              {(!multiBed || draft.recordId) && (
                <Field label={t(nameLabel[draft.kind])} error={errors.name}>
                  <input autoFocus value={draft.name} maxLength={100} onChange={event => { setDraft({ ...draft, name: event.target.value }); setErrors({}) }} />
                </Field>
              )}
              {draft.kind === 'bed' && !draft.recordId && (
                <Field label={t('Bed type')}>
                  <select value={draft.type} onChange={event => setDraft({ ...draft, type: event.target.value })}>
                    {bedTypes.map(type => <option key={type} value={type}>{t(type)}</option>)}
                  </select>
                </Field>
              )}
            </div>
          </Card>
        </FormPage>
      )}
      <Card
        title={hospital.name}
        actions={!draft && <Button type="button" onClick={() => open('ward', hospitalId)}><Plus size={18} />{t('Add ward')}</Button>}
      >
        {wards.length === 0 ? (
          <EmptyState title={t('No wards yet')} description={t('Add a ward to start organizing rooms and beds.')} />
        ) : (
          <ul className="team-tree">
            {wards.map(ward => {
              const rooms = db.rooms.filter(item => item.wardId === ward.id)
              return (
                <li key={ward.id}>
                  <div className="team-tree-row">
                    <Layers3 aria-hidden="true" size={20} />
                    <strong>{ward.name}</strong>
                    {!draft && <div className="actions">
                      <Button type="button" variant="ghost" onClick={() => open('ward', hospitalId, ward)} aria-label={t('Rename {name}', { name: ward.name })}>{t('Rename')}</Button>
                      <Button type="button" variant="secondary" onClick={() => open('room', ward.id)} aria-label={t('Add room to {name}', { name: ward.name })}>{t('Add room')}</Button>
                    </div>}
                  </div>
                  {rooms.length === 0 && <p className="muted team-tree-empty">{t('No rooms yet.')}</p>}
                  {rooms.length > 0 && (
                    <ul>
                      {rooms.map(item => {
                        const beds = roomBeds(db, item.id)
                        return (
                          <li key={item.id}>
                            <div className="team-tree-row">
                              <DoorOpen aria-hidden="true" size={20} />
                              <strong>{item.name}</strong>
                              {!draft && <div className="actions">
                                <Button type="button" variant="ghost" onClick={() => open('room', ward.id, item)} aria-label={t('Rename {name}', { name: item.name })}>{t('Rename')}</Button>
                                <Button type="button" variant="secondary" onClick={() => open('bed', item.id)} aria-label={t('Add bed to {name}', { name: item.name })}>{t('Add bed')}</Button>
                              </div>}
                            </div>
                            {beds.length === 0 && <p className="muted team-tree-empty">{t('No beds yet.')}</p>}
                            {beds.length > 0 && (
                              <ul>
                                {beds.map(bed => (
                                  <li className="team-tree-row" key={bed.id}>
                                    <BedDouble aria-hidden="true" size={18} />
                                    <span>{bed.name} <span className="muted">· {t(bed.type)}</span></span>
                                    {!draft && <Button type="button" variant="ghost" onClick={() => open('bed', item.id, bed)} aria-label={t('Rename {name}', { name: bed.name })}>{t('Rename')}</Button>}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}

export function HospitalMissing() {
  const { t } = useI18n()
  return <EmptyState title={t('Hospital unavailable')} description={t('Choose a hospital from the directory.')} action={<Link to="/medguard"><Building2 size={18} />{t('Back to hospitals')}</Link>} />
}

export function Cameras() {
  const { id: hospitalId = '' } = useParams()
  return <CameraPage key={hospitalId} hospitalId={hospitalId} />
}

function CameraPage({ hospitalId }: { hospitalId: string }) {
  const { db, write, cameraOffline } = useMock()
  const { t, date } = useI18n()
  const navigate = useNavigate()
  const [draft, setDraft] = useState<{ name: string; roomId: string } | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const hospital = db.hospitals.find(item => item.id === hospitalId)
  const wards = db.wards.filter(ward => ward.hospitalId === hospitalId)
  const rooms = db.rooms.filter(room => wards.some(ward => ward.id === room.wardId))
  const cameras = db.cameras.filter(camera => camera.hospitalId === hospitalId)
  const filtered = cameras.filter(camera => !filter || cameraStatus(camera, cameraOffline) === filter)
  const roomName = (roomId: string) => rooms.find(room => room.id === roomId)?.name ?? t('Room unavailable')

  if (!hospital) return <HospitalMissing />

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft || !rooms.some(room => room.id === draft.roomId)) return
    const name = draft.name.trim()
    if (!name || cameras.some(camera => sameName(camera.name, name))) {
      setError(t(name ? 'A camera with this name already exists.' : 'Enter the camera name.'))
      return
    }
    const camera = { id: id('camera'), hospitalId, name, roomId: draft.roomId, status: 'Online', lastEvent: '' }
    write('Added camera', name, current => ({ ...current, cameras: [...current.cameras, camera] }), { hospitalId })
    setDraft(null)
    setError('')
  }

  return (
    <div className="stack">
      <PageHeader title={t('Cameras')} description={hospital.name} actions={
        <div className="actions">
          <Link to={teamPath(hospital.id, 'structure')}>{t('Wards and rooms')}</Link>
          {rooms.length > 0 && !draft && (
            <Button type="button" onClick={() => {
              const names = new Set(cameras.map(camera => camera.name.toUpperCase()))
              let number = 1
              while (names.has(`CAM-${String(number).padStart(2, '0')}`)) number++
              setDraft({ name: `CAM-${String(number).padStart(2, '0')}`, roomId: rooms[0].id })
            }}><Plus size={18} />{t('Add camera')}</Button>
          )}
        </div>
      } />
      {rooms.length === 0 && (
        <Card>
          <EmptyState
            title={t('A room is required')}
            description={t('Add a room before registering a camera.')}
            action={<Link to={teamPath(hospital.id, 'structure')}>{t('Set up wards and rooms')}</Link>}
          />
        </Card>
      )}
      {draft && rooms.length > 0 && (
        <FormPage onSubmit={add} dirty onCancel={() => { setDraft(null); setError('') }} saveLabel={t('Add camera')}>
          <Card title={t('New camera')}>
            <div className="team-form-fields">
              <Field label={t('Camera name')} error={error}>
                <input autoFocus maxLength={100} value={draft.name} onChange={event => { setDraft({ ...draft, name: event.target.value }); setError('') }} />
              </Field>
              <Field label={t('Room')}>
                <select value={draft.roomId} onChange={event => setDraft({ ...draft, roomId: event.target.value })}>
                  {rooms.map(room => <option key={room.id} value={room.id}>{wards.find(ward => ward.id === room.wardId)?.name} · {room.name}</option>)}
                </select>
              </Field>
            </div>
          </Card>
        </FormPage>
      )}
      <Card title={t('Camera inventory')}>
        <DataTable
          rows={filtered}
          rowKey={camera => camera.id}
          searchLabel={t('Search cameras')}
          searchText={camera => `${camera.name} ${roomName(camera.roomId)}`}
          filters={
            <Field label={t('Status')}>
              <select value={filter} onChange={event => setFilter(event.target.value)}>
                <option value="">{t('All statuses')}</option>
                {['Online', 'Offline'].map(value => <option key={value} value={value}>{t(value)}</option>)}
              </select>
            </Field>
          }
          emptyTitle={t('No cameras found')}
          columns={[
            { heading: t('Camera'), sort: camera => camera.name, cell: camera => <Link className="team-inline-link" to={mappingPath(camera.id)}><Video aria-hidden="true" size={18} />{camera.name}</Link> },
            { heading: t('Room'), sort: camera => roomName(camera.roomId), cell: camera => roomName(camera.roomId) },
            { heading: t('Status'), sort: camera => t(cameraStatus(camera, cameraOffline)), cell: camera => <StatusChip status={cameraStatus(camera, cameraOffline)} /> },
            { heading: t('Last event'), sort: camera => camera.lastEvent, cell: camera => camera.lastEvent ? date(camera.lastEvent, true) : t('No events yet') },
            {
              heading: t('Beds covered by camera'),
              sort: camera => new Set(db.zones.filter(zone => zone.camId === camera.id && zone.bedId).map(zone => zone.bedId)).size,
              cell: camera => {
                const linked = new Set(db.zones.filter(zone => zone.camId === camera.id && zone.bedId).map(zone => zone.bedId))
                return roomBeds(db, camera.roomId).filter(bed => linked.has(bed.id)).map(bed => bed.name).join(', ') || t('Unmapped')
              },
            },
          ]}
          actions={camera => [{ label: t('Map bed zones'), run: () => navigate(mappingPath(camera.id)) }]}
        />
      </Card>
    </div>
  )
}
