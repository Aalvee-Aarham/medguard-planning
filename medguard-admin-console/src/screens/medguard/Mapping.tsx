import { useRef, useState, type FormEvent, type PointerEvent } from 'react'
import { Crosshair, Plus, ScanLine, Trash2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Button, Card, EmptyState, Field, FormPage, Notice, PageHeader, ReasonDialog, StatusChip } from '../../components'
import { useI18n } from '../../i18n'
import { id, type Database } from '../../mock/data'
import { useMock } from '../../mock/store'
import cameraFrame from './camera-frame.jpg'
import { cameraStatus, roomBeds, teamPath } from './utils'
import './team.css'

type Zone = Database['zones'][number]
type Rect = Zone['rect']
type Point = { x: number; y: number }
const minimumSize = 0.025
const frameWidth = 1080
const frameHeight = 720
const coordinates = { x: 'Horizontal position', y: 'Vertical position', width: 'Zone width', height: 'Zone height' }

function bounds(start: Point, end: Point): Rect {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(start.x - end.x),
    height: Math.abs(start.y - end.y),
  }
}

function pointerPoint(event: PointerEvent<SVGSVGElement>): Point {
  const rect = event.currentTarget.getBoundingClientRect()
  return {
    x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
  }
}

function ZoneRectangle({ rect, index }: { rect: Rect; index?: number }) {
  const x = rect.x * frameWidth
  const y = rect.y * frameHeight
  return (
    <g className={index === undefined ? 'team-zone-preview' : 'team-zone-outline'}>
      <rect x={x} y={y} width={rect.width * frameWidth} height={rect.height * frameHeight} vectorEffect="non-scaling-stroke" />
      {index !== undefined && <>
        <rect className="team-zone-number" x={x} y={y} width={33} height={36} />
        <text x={x + 16.5} y={y + 25} textAnchor="middle">{index}</text>
      </>}
    </g>
  )
}

export function Mapping() {
  const { camId = '' } = useParams()
  return <MappingPage key={camId} cameraId={camId} />
}

function MappingPage({ cameraId }: { cameraId: string }) {
  const { db, write, cameraOffline } = useMock()
  const { t } = useI18n()
  const [draft, setDraft] = useState<Zone[] | null>(null)
  const [tests, setTests] = useState<Record<string, boolean>>({})
  const [preview, setPreview] = useState<Rect | null>(null)
  const [dialog, setDialog] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const drag = useRef<{ pointerId: number; start: Point } | null>(null)
  const camera = db.cameras.find(item => item.id === cameraId)

  if (!camera) {
    return <EmptyState title={t('Camera unavailable')} description={t('Choose a hospital and open its camera inventory.')} action={<Link to="/medguard">{t('Back to hospitals')}</Link>} />
  }

  const room = db.rooms.find(item => item.id === camera.roomId)
  const ward = db.wards.find(item => item.id === room?.wardId)
  const beds = room ? roomBeds(db, room.id) : []
  const knownBeds = new Set(beds.map(bed => bed.id))
  const persisted = db.zones.filter(zone => zone.camId === cameraId)
  const zones = draft ?? persisted
  const online = cameraStatus(camera, cameraOffline) === 'Online'
  const target = camera.name
  const hospitalId = camera.hospitalId
  const openTests = Object.keys(tests).length > 0
  const canAdd = zones.length < beds.length

  function edit(newZones: Zone[]) {
    setDraft(newZones)
    setTests({})
    setError('')
    setSaved(false)
  }

  function addZone(rect: Rect) {
    if (!canAdd) return
    edit([...zones, { id: id('zone'), camId: cameraId, bedId: '', rect }])
  }

  function onPointerDown(event: PointerEvent<SVGSVGElement>) {
    if (!canAdd || !event.isPrimary || event.button !== 0) return
    const point = pointerPoint(event)
    drag.current = { pointerId: event.pointerId, start: point }
    event.currentTarget.setPointerCapture(event.pointerId)
    setPreview(bounds(point, point))
  }

  function onPointerMove(event: PointerEvent<SVGSVGElement>) {
    if (drag.current?.pointerId !== event.pointerId) return
    setPreview(bounds(drag.current.start, pointerPoint(event)))
  }

  function onPointerUp(event: PointerEvent<SVGSVGElement>) {
    if (drag.current?.pointerId !== event.pointerId) return
    const rect = bounds(drag.current.start, pointerPoint(event))
    clearPointer()
    if (rect.width >= minimumSize && rect.height >= minimumSize) addZone(rect)
  }

  function clearPointer() {
    drag.current = null
    setPreview(null)
  }

  function runTests() {
    const results = Object.fromEntries(zones.map(zone => [
      zone.id,
      online && knownBeds.has(zone.bedId) && zone.rect.width >= minimumSize && zone.rect.height >= minimumSize,
    ]))
    setTests(results)
    write('Ran mock detection', target, current => current, { hospitalId })
  }

  function save(reason?: string) {
    write('Saved bed-zone mapping', target, current => ({
      ...current,
      zones: [...current.zones.filter(zone => zone.camId !== cameraId), ...zones],
    }), { hospitalId, reason })
    setDialog(false)
    setDraft(null)
    setSaved(true)
  }

  function confirmSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft) return
    if (zones.some(zone => !knownBeds.has(zone.bedId))) {
      setError(t('Choose a bed for every zone, or remove the unassigned zones.'))
      return
    }
    if (persisted.some(zone => !zones.some(item => item.id === zone.id))) {
      setDialog(true)
      return
    }
    save()
  }

  return (
    <div className="stack">
      <PageHeader
        title={t('Bed-zone mapping')}
        description={[camera.name, ward?.name, room?.name].filter(Boolean).join(' · ')}
        actions={<Link to={teamPath(hospitalId, 'cameras')}>{t('Back to cameras')}</Link>}
      />
      {!online && <Notice tone="warning">{t('The camera is offline. You can edit its zones. Test detection will fail until it is online.')}</Notice>}
      {saved && <Notice tone="success">{t('Bed-zone mapping saved.')}</Notice>}
      {error && <Notice tone="danger">{error}</Notice>}
      <FormPage
        onSubmit={confirmSave}
        dirty={draft !== null}
        saveLabel={t('Save mapping')}
        onCancel={draft ? () => { setDraft(null); setTests({}); setError(''); setSaved(false) } : undefined}
      >
        <div className="team-mapping-grid">
          <Card title={t('Mock camera frame')} actions={<StatusChip status={online ? 'Online' : 'Offline'} />}>
            <div className="team-camera-frame">
              <img src={cameraFrame} width={frameWidth} height={frameHeight} alt={t('A mock camera view of three empty hospital beds')} />
              <svg
                viewBox={`0 0 ${frameWidth} ${frameHeight}`}
                aria-hidden="true"
                data-draw={canAdd}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={clearPointer}
                onLostPointerCapture={clearPointer}
              >
                {zones.map((zone, index) => <ZoneRectangle key={zone.id} rect={zone.rect} index={index + 1} />)}
                {preview && <ZoneRectangle rect={preview} />}
              </svg>
            </div>
            <p className="team-frame-caption muted"><Crosshair aria-hidden="true" size={18} />{canAdd ? t('Drag across the frame to draw a zone around a bed.') : t('Each bed in this room can have one zone on this camera.')}</p>
          </Card>
          <Card title={t('Zones')}>
            <div className="stack">
              {beds.length === 0 && (
                <EmptyState title={t('No beds in this room')} action={<Link to={teamPath(hospitalId, 'structure')}>{t('Set up wards and rooms')}</Link>} />
              )}
              {beds.length > 0 && zones.length === 0 && <p className="muted">{t('Draw the first zone or add one and adjust its coordinates.')}</p>}
              {zones.map((zone, index) => (
                <section className="team-zone-item" key={zone.id} aria-label={t('Zone {number}', { number: index + 1 })}>
                  <div className="team-zone-header">
                    <strong>{t('Zone {number}', { number: index + 1 })}</strong>
                    <Button
                      type="button"
                      variant="ghost"
                      className="team-remove-zone"
                      aria-label={t('Remove zone {number}', { number: index + 1 })}
                      onClick={() => edit(zones.filter(item => item.id !== zone.id))}
                    >
                      <Trash2 aria-hidden="true" size={18} />
                    </Button>
                  </div>
                  <Field label={t('Linked bed')}>
                    <select value={zone.bedId} onChange={event => edit(zones.map(item => item.id === zone.id ? { ...item, bedId: event.target.value } : item))}>
                      <option value="">{t('Choose bed')}</option>
                      {beds.map(bed => <option key={bed.id} value={bed.id} disabled={zones.some(item => item.id !== zone.id && item.bedId === bed.id)}>{bed.name}</option>)}
                    </select>
                  </Field>
                  <details className="team-zone-coordinates">
                    <summary>{t('Adjust rectangle')}</summary>
                    {(Object.keys(coordinates) as (keyof Rect)[]).map(key => {
                      const minimum = key === 'width' || key === 'height' ? minimumSize : 0
                      const limits = { x: 1 - zone.rect.width, y: 1 - zone.rect.height, width: 1 - zone.rect.x, height: 1 - zone.rect.y }
                      return (
                        <Field key={key} label={`${t(coordinates[key])} · ${Math.round(zone.rect[key] * 100)}%`}>
                          <input
                            type="range"
                            min={Math.ceil(minimum * 100)}
                            max={Math.floor(limits[key] * 100)}
                            value={Math.round(zone.rect[key] * 100)}
                            onChange={event => {
                              const value = Number(event.target.value) / 100
                              edit(zones.map(item => item.id === zone.id ? { ...item, rect: { ...item.rect, [key]: value } } : item))
                            }}
                          />
                        </Field>
                      )
                    })}
                  </details>
                  {openTests && <StatusChip status={tests[zone.id] && online ? 'Passed' : 'Failed'} />}
                </section>
              ))}
              <div className="actions">
                {beds.length > 0 && <Button type="button" variant="secondary" disabled={!canAdd} onClick={() => {
                  const offset = (zones.length % 4) * 0.05
                  addZone({ x: 0.3 + offset, y: 0.3 + offset, width: 0.2, height: 0.25 })
                }}><Plus aria-hidden="true" size={18} />{t('Add zone')}</Button>}
                {zones.length > 0 && <Button type="button" variant="ghost" onClick={runTests}><ScanLine aria-hidden="true" size={18} />{t('Run test detection')}</Button>}
              </div>
              {openTests && <div role="status" className="muted">{t('{passed} of {total} zones passed mock detection.', {
                passed: online ? Object.values(tests).filter(Boolean).length : 0,
                total: zones.length,
              })}</div>}
            </div>
          </Card>
        </div>
      </FormPage>
      {dialog && <ReasonDialog
        title={t('Remove saved zones?')}
        description={t('The removed zones will stop covering their linked beds on this camera.')}
        confirmLabel={t('Remove zones and save')}
        onConfirm={save}
        onClose={() => setDialog(false)}
        danger
      />}
    </div>
  )
}
