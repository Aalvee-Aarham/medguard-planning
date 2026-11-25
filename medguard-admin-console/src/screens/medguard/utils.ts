import type { Database } from '../../mock/data'

export const bedTypes = ['General', 'ICU', 'Observation', 'Private']

export function teamPath(hospitalId: string, page: 'structure' | 'cameras' | 'infra') {
  return `/medguard/hospitals/${encodeURIComponent(hospitalId)}/${page}`
}

export function mappingPath(cameraId: string) {
  return `/medguard/cameras/${encodeURIComponent(cameraId)}/mapping`
}

export function planLabel(plans: Database['plans'], value: string) {
  return plans.find(plan => plan.id === value)?.name ?? value
}

export function normalizeContact(value: string) {
  const contact = value.trim().toLowerCase()
  const compact = contact.replace(/[\s()-]/g, '')
  return /^\+?\d+$/.test(compact) ? compact.replace(/^\+/, '').replace(/^880(?=1\d{9}$)/, '0') : contact
}

export function validContact(value: string) {
  const contact = normalizeContact(value)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) || /^\d{7,15}$/.test(contact)
}

export function sameName(value: string, expected: string) {
  return value.trim().toLowerCase() === expected.trim().toLowerCase()
}

export function roomBeds(db: Database, roomId: string) {
  return db.beds.filter(bed => bed.roomId === roomId)
}

export function cameraStatus(camera: Database['cameras'][number], forceOffline: boolean) {
  return forceOffline && camera.id === 'cam-02' ? 'Offline' : camera.status
}
