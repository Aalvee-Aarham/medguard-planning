export type Area = 'hospital' | 'medguard'

export interface Hospital {
  id: string
  name: string
  address: string
  plan: string
  health: string
  status: string
  renewal: string
  adminName: string
  adminContact: string
  logo: string
  consentEn: string
  consentBn: string
}

export interface Ward {
  id: string
  hospitalId: string
  name: string
}

export interface Room {
  id: string
  wardId: string
  name: string
}

export interface Bed {
  id: string
  wardId: string
  roomId: string
  name: string
  type: string
  outOfService: boolean
}

export interface Staff {
  id: string
  hospitalId: string
  name: string
  phone: string
  role: string
  doctorTier: string
  isSenior: boolean
  wardIds: string[]
  status: string
}

export interface ShiftRule {
  wardId: string
  morningStart: string
  morningEnd: string
  eveningStart: string
  eveningEnd: string
  nightStart: string
  nightEnd: string
  ratio: number
  rest: number
}

export interface VitalConfig {
  wardId: string
  key: string
  name: string
  unit: string
  min: number
  max: number
  enabled: boolean
}

export interface Drug {
  id: string
  hospitalId?: string
  brand: string
  generic: string
  strength: string
  form: string
  source: 'base' | 'hospital'
}

export interface Camera {
  id: string
  hospitalId: string
  roomId: string
  name: string
  status: string
  lastEvent: string
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface BedZone {
  id: string
  camId: string
  bedId: string
  rect: Rect
}

export interface Device {
  id: string
  hospitalId: string
  name: string
  type: string
  status: string
  lastSync: string
}

export interface Server {
  hospitalId: string
  name: string
  load: number
  storage: number
  lastSync: string
  model: string
  version: string
}

export interface EmergencyAccess {
  id: string
  hospitalId: string
  staff: string
  patient: string
  patientId: string
  reason: string
  at: string
  status: string
}

export interface AuditEntry {
  id: string
  area: Area
  hospitalId?: string
  who: string
  action: string
  target: string
  at: string
  patient?: string
  reason?: string
}

export interface Invoice {
  id: string
  hospitalId: string
  date: string
  amount: number
  status: string
}

export interface Plan {
  id: string
  name: string
  price: number
  beds: number
  wards: number
}

export interface BmdcCheck {
  id: string
  name: string
  registration: string
  at: string
  status: string
  details: string
}

export interface SupportAccount {
  id: string
  name: string
  phone: string
  email: string
  status: string
  verified: boolean
  plan: string
}

export interface Database {
  hospitals: Hospital[]
  wards: Ward[]
  rooms: Room[]
  beds: Bed[]
  staff: Staff[]
  shifts: ShiftRule[]
  vitals: VitalConfig[]
  drugs: Drug[]
  cameras: Camera[]
  zones: BedZone[]
  devices: Device[]
  servers: Server[]
  emergency: EmergencyAccess[]
  audit: AuditEntry[]
  invoices: Invoice[]
  plans: Plan[]
  bmdc: BmdcCheck[]
  accounts: SupportAccount[]
}

export function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

const wards: Ward[] = [
  { id: 'neuro-b', hospitalId: 'shanti', name: 'Neuro Ward B' },
  { id: 'medicine-a', hospitalId: 'shanti', name: 'Medicine Ward A' },
]

const rooms: Room[] = [
  { id: 'neuro-01', wardId: 'neuro-b', name: 'Room B01' },
  { id: 'neuro-02', wardId: 'neuro-b', name: 'Room B02' },
  { id: 'medicine-01', wardId: 'medicine-a', name: 'Room A01' },
]

const neuroBeds = Array.from({ length: 10 }, (_, index): Bed => ({
  id: `neuro-bed-${index + 1}`,
  wardId: 'neuro-b',
  roomId: index < 5 ? 'neuro-01' : 'neuro-02',
  name: `Bed ${index + 1}`,
  type: index > 7 ? 'Observation' : 'General',
  outOfService: false,
}))

const medicineBeds = Array.from({ length: 12 }, (_, index): Bed => ({
  id: `medicine-bed-${index + 1}`,
  wardId: 'medicine-a',
  roomId: 'medicine-01',
  name: `Bed ${index + 1}`,
  type: index === 11 ? 'Private' : 'General',
  outOfService: index === 11,
}))

const staffSeed: [string, string, string, boolean, string[]][] = [
  ['Rina Akter', 'Nurse', '', false, ['neuro-b']],
  ['Mitu Das', 'Nurse', '', false, ['medicine-a']],
  ['Shahana Parvin', 'Nurse', '', true, ['neuro-b']],
  ['Dr. Karim Hossain', 'Doctor', 'Consultant', false, ['neuro-b']],
  ['Dr. Nusrat Jahan', 'Doctor', 'MO', false, ['medicine-a']],
  ['Dr. Tanvir Ahmed', 'Doctor', 'Intern', false, ['neuro-b']],
  ['Habib Rahman', 'Ward manager', '', false, ['neuro-b', 'medicine-a']],
  ['Salma Khatun', 'Admission desk', '', false, ['medicine-a']],
]

const normalRanges: Omit<VitalConfig, 'wardId'>[] = [
  { key: 'bp-systolic', name: 'Systolic blood pressure', unit: 'mmHg', min: 90, max: 140, enabled: true },
  { key: 'bp-diastolic', name: 'Diastolic blood pressure', unit: 'mmHg', min: 60, max: 90, enabled: true },
  { key: 'pulse', name: 'Pulse', unit: 'bpm', min: 60, max: 100, enabled: true },
  { key: 'temperature', name: 'Temperature', unit: '°C', min: 36, max: 37.5, enabled: true },
  { key: 'spo2', name: 'Oxygen saturation', unit: '%', min: 95, max: 100, enabled: true },
  { key: 'respiratory-rate', name: 'Respiratory rate', unit: 'breaths/min', min: 12, max: 20, enabled: false },
]

export const initialData: Database = {
  hospitals: [
    {
      id: 'shanti', name: 'Shanti Hospital', address: 'Dhanmondi, Dhaka', plan: 'pilot', health: 'Healthy',
      status: 'Active', renewal: '2027-01-01', adminName: 'Farhana Haque', adminContact: 'farhana@example.test',
      logo: '', consentEn: 'I consent to sharing my health information with my care team for this hospital stay.',
      consentBn: 'এই হাসপাতালে থাকার সময় আমার চিকিৎসা দলের সঙ্গে আমার স্বাস্থ্যতথ্য ভাগ করতে আমি সম্মতি দিচ্ছি।',
    },
    {
      id: 'padma', name: 'Padma Medical Centre', address: 'Rajshahi', plan: 'standard', health: 'Attention',
      status: 'Active', renewal: '2027-02-01', adminName: 'Nabila Rahman', adminContact: 'nabila@example.test',
      logo: '', consentEn: '', consentBn: '',
    },
    {
      id: 'rupsha', name: 'Rupsha General Hospital', address: 'Khulna', plan: 'network', health: 'Critical',
      status: 'Onboarding', renewal: '2027-03-01', adminName: 'Asif Hossain', adminContact: 'asif@example.test',
      logo: '', consentEn: '', consentBn: '',
    },
  ],
  wards,
  rooms,
  beds: [...neuroBeds, ...medicineBeds],
  staff: staffSeed.map(([name, role, doctorTier, isSenior, wardIds], index) => ({
    id: `staff-${index + 1}`, hospitalId: 'shanti', name, phone: `+88010000000${String(index + 1).padStart(2, '0')}`,
    role, doctorTier, isSenior, wardIds, status: 'Active',
  })),
  shifts: wards.map(({ id: wardId }) => ({
    wardId, morningStart: '08:00', morningEnd: '14:00', eveningStart: '14:00', eveningEnd: '20:00',
    nightStart: '20:00', nightEnd: '08:00', ratio: 8, rest: 10,
  })),
  vitals: wards.flatMap(({ id: wardId }) => normalRanges.map((range) => ({ ...range, wardId }))),
  drugs: [
    { id: 'drug-1', brand: 'Napa', generic: 'Paracetamol', strength: '500 mg', form: 'Tablet', source: 'base' },
    { id: 'drug-2', brand: 'Seclo', generic: 'Omeprazole', strength: '20 mg', form: 'Capsule', source: 'base' },
    { id: 'drug-3', brand: 'Amdocal', generic: 'Amlodipine', strength: '5 mg', form: 'Tablet', source: 'base' },
    { id: 'drug-4', hospitalId: 'shanti', brand: 'Orsaline-N', generic: 'Oral rehydration salts', strength: '10.25 g', form: 'Sachet', source: 'hospital' },
  ],
  cameras: [
    { id: 'cam-01', hospitalId: 'shanti', roomId: 'neuro-01', name: 'CAM-01', status: 'Online', lastEvent: '2026-11-25T09:24:00+06:00' },
    { id: 'cam-02', hospitalId: 'shanti', roomId: 'neuro-02', name: 'CAM-02', status: 'Online', lastEvent: '2026-11-25T09:21:00+06:00' },
  ],
  zones: [
    { x: 0.075, y: 0.33, width: 0.218, height: 0.42 },
    { x: 0.405, y: 0.30, width: 0.21, height: 0.40 },
    { x: 0.655, y: 0.28, width: 0.24, height: 0.36 },
  ].map((rect, index) => ({
    id: `zone-${index + 1}`, camId: 'cam-02', bedId: `neuro-bed-${index + 6}`,
    rect,
  })),
  devices: [
    { id: 'device-1', hospitalId: 'shanti', name: 'Nurse station tablet', type: 'Shared', status: 'Online', lastSync: '2026-11-25T09:12:00+06:00' },
    { id: 'device-2', hospitalId: 'shanti', name: 'Ward manager phone', type: 'Personal', status: 'Online', lastSync: '2026-11-25T09:18:00+06:00' },
  ],
  servers: [
    { hospitalId: 'shanti', name: 'Shanti edge server', load: 38, storage: 62, lastSync: '2026-11-25T09:20:00+06:00', model: 'Ward detection', version: '1.4.2' },
    { hospitalId: 'padma', name: 'Padma edge server', load: 76, storage: 87, lastSync: '2026-11-25T08:20:00+06:00', model: 'Ward detection', version: '1.4.1' },
  ],
  emergency: [
    { id: 'emergency-1', hospitalId: 'shanti', staff: 'Shahana Parvin', patient: 'Rahima Begum', patientId: '1042', reason: 'Urgent access during ward handover', at: '2026-11-25T08:05:00+06:00', status: 'Pending' },
  ],
  audit: [
    { id: 'audit-1', area: 'hospital', hospitalId: 'shanti', who: 'Shahana Parvin', action: 'Opened emergency access', target: '1042', patient: 'Rahima Begum', reason: 'Urgent access during ward handover', at: '2026-11-25T08:05:00+06:00' },
    { id: 'audit-2', area: 'medguard', hospitalId: 'shanti', who: 'Tania', action: 'Registered hospital', target: 'Shanti Hospital', at: '2026-11-24T10:30:00+06:00' },
  ],
  invoices: [
    { id: 'INV-2026-011', hospitalId: 'shanti', date: '2026-11-01', amount: 8000, status: 'Paid' },
    { id: 'INV-2026-012', hospitalId: 'shanti', date: '2026-12-01', amount: 8000, status: 'Due' },
    { id: 'INV-2026-013', hospitalId: 'padma', date: '2026-11-15', amount: 18000, status: 'Paid' },
  ],
  plans: [
    { id: 'pilot', name: 'Pilot', price: 8000, beds: 30, wards: 3 },
    { id: 'standard', name: 'Standard', price: 18000, beds: 100, wards: 10 },
    { id: 'network', name: 'Network', price: 32000, beds: 250, wards: 25 },
  ],
  bmdc: [
    { id: 'bmdc-1', name: 'Dr. Karim Hossain', registration: 'A-DEMO-104', at: '2026-11-25T08:50:00+06:00', status: 'Verified', details: 'Registration matched' },
    { id: 'bmdc-2', name: 'Dr. Nusrat Jahan', registration: 'A-DEMO-105', at: '2026-11-24T10:45:00+06:00', status: 'Failed', details: 'Registry request timed out' },
  ],
  accounts: [
    { id: 'account-1', name: 'Rina Akter', phone: '+8801000000001', email: 'rina@example.test', status: 'Active', verified: true, plan: 'Pilot' },
    { id: 'account-2', name: 'Demo account', phone: '+8801000000020', email: 'locked@example.test', status: 'Locked', verified: false, plan: 'Standard' },
  ],
}
