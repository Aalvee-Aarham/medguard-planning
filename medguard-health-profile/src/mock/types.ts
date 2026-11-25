export type ISODate = string

export type SourceKind = 'self' | 'doctor' | 'hospital' | 'ai'
export interface Source {
  kind: SourceKind
  by: string
  at: ISODate
}

/** AI-read items carry confidence + confirmed. Nothing AI-read goes live until confirmed (safety rule 1). */
export interface AiMeta {
  confidence?: number
  confirmed?: boolean
}

export type Role = 'owner' | 'caregiver-manage' | 'caregiver-view' | 'doctor'

export interface Account {
  id: string
  name: string
  phone?: string
  email?: string
  google?: boolean
  type: 'personal' | 'doctor'
  doctor?: { name: string; bmdc: string; specialty: string; chamber: string; verified: boolean }
  pin: string
  createdAt: ISODate
}

export interface Profile {
  id: string
  name: string
  dob: ISODate
  sex: 'male' | 'female' | 'other'
  bloodGroup?: string
  photo?: string
  relation: 'self' | 'mother' | 'father' | 'sister' | 'brother' | 'spouse' | 'child' | 'other'
  /** your role on this profile */
  role: Role
  hospital?: HospitalLink
  dangerSigns?: boolean
}

export interface HospitalLink {
  state: 'admitted' | 'waiting'
  hospital: string
  ward: string
  bed?: string
  since: ISODate
  patientId?: string
  queuePosition?: number
  urgency?: { reason: string; sentAt: ISODate; answer?: 'raised' | 'declined'; answerNote?: string }
}

export type RecordSection =
  | 'conditions'
  | 'allergies'
  | 'medicines'
  | 'tests'
  | 'imaging'
  | 'prescriptions'
  | 'vitals'
  | 'surgeries'
  | 'vaccinations'
  | 'lifestyle'
  | 'doctors'

export interface RecordItem extends AiMeta {
  id: string
  profileId: string
  section: RecordSection
  title: string
  detail?: string
  date: ISODate
  source: Source
  documentId?: string
  history?: { by: string; at: ISODate; field: string; from: string; to: string }[]
}

export interface Allergy extends RecordItem {
  section: 'allergies'
}

export interface Condition extends RecordItem {
  section: 'conditions'
}

export interface Medicine extends AiMeta {
  id: string
  profileId: string
  name: string
  dose: string
  times: string[] // "08:00"
  food: 'before' | 'after' | 'any'
  prescribedBy: string
  start: ISODate
  end?: ISODate
  current: boolean
  source: Source
  documentId?: string
  reminder: { on: boolean; days: number[]; durationDays?: number; sound: string; tellCaregivers: boolean }
}

export type DoseStatus = 'taken' | 'skipped' | 'missed' | 'snoozed'
export interface DoseLog {
  id: string
  medicineId: string
  profileId: string
  due: ISODate
  status: DoseStatus
  at?: ISODate
  reason?: string
}

export interface TestResult extends AiMeta {
  id: string
  profileId: string
  name: string
  unit: string
  low: number
  high: number
  points: { date: ISODate; value: number; documentId?: string }[]
  source: Source
}

export interface Document {
  id: string
  profileId: string
  title: string
  kind: 'prescription' | 'report' | 'imaging' | 'discharge' | 'other'
  date: ISODate
  pages: number
  source: Source
  /** generated illustration colour seed for the mock "photo" */
  seed: number
  extracted: { label: string; value: string; confidence: number; confirmed: boolean }[]
}

export type IssueKind = 'duplicate' | 'name' | 'unreadable' | 'conflict'
export interface Issue {
  id: string
  kind: IssueKind
  detail: string
  options?: string[]
  resolved?: string
}

export interface UploadBatch {
  id: string
  profileId: string
  createdAt: ISODate
  pages: { id: string; name: string; seed: number }[]
  status: 'processing' | 'issues' | 'review' | 'failed' | 'done'
  progress: number
  issues: Issue[]
  fields: { id: string; section: RecordSection; label: string; value: string; confidence: number; confirmed: boolean; page: number }[]
  failReason?: string
}

export interface Admission {
  id: string
  profileId: string
  hospital: string
  ward: string
  bed: string
  from: ISODate
  to?: ISODate
  summary: string
  medicines: string[]
  results: string[]
  source: Source
}

export interface AccessGrant {
  id: string
  profileId: string
  who: string
  kind: 'hospital' | 'doctor' | 'caregiver' | 'link'
  until?: ISODate
  sections?: string[]
  permission?: 'view' | 'manage'
}

export interface AccessLogEntry {
  id: string
  profileId: string
  who: string
  action: 'viewed' | 'edited' | 'added' | 'emergency' | 'shared' | 'revoked'
  at: ISODate
  reason?: string
  emergencyId?: string
}

export interface Caregiver {
  id: string
  profileId: string
  name: string
  phone: string
  permission: 'view' | 'manage'
  status: 'active' | 'invited'
}

export interface ChatMessage {
  id: string
  from: 'user' | 'ai'
  text: string
  cite?: string
  doctorNote?: boolean
}
export interface ChatThread {
  id: string
  profileId: string
  title: string
  at: ISODate
  messages: ChatMessage[]
}

export interface SimilarCase {
  id: string
  age: number
  sex: 'male' | 'female'
  condition: string
  matches: string[]
  summary: string
  treatment: string
  outcome: string
  citation: string
}

export interface Notification {
  id: string
  kind: 'reminder' | 'processed' | 'access' | 'emergency' | 'hospital' | 'queue' | 'invite' | 'subscription' | 'missed'
  title: string
  body: string
  at: ISODate
  read: boolean
  link?: string
  tier: 'high' | 'normal'
}

export interface Subscription {
  plan: 'free' | 'premium'
  renews?: ISODate
  method?: 'bkash' | 'nagad' | 'card'
  receipts: { id: string; at: ISODate; amount: number }[]
}

export interface Invite {
  id: string
  from: string
  profileName: string
  permission: 'view' | 'manage'
  status: 'pending' | 'accepted' | 'declined'
}

export interface SharedPatient {
  id: string
  profileId: string
  name: string
  age: number
  sex: 'male' | 'female'
  until: ISODate
  via: 'qr' | 'link'
}

export interface Settings {
  lang: 'en' | 'bn'
  textSize: 1 | 1.25 | 1.5 | 2
  biometric: boolean
  autoLockMin: number
  consents: { terms?: ISODate; privacy?: ISODate; health?: ISODate; ai?: ISODate }
  notif: Record<string, boolean>
  similarAccepted: boolean
  onboarded: boolean
}
