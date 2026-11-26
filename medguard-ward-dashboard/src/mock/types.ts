// Types for the mock data. More are added as later steps need them (see PLAN.md section 8).

export type Role = 'manager' | 'desk' | 'manager-senior';

export interface User {
  id: string;
  name: string;
  role: Role;
}

export interface Ward {
  id: string;
  name: string;
  hospital: string;
  beds: number;
  /** Fixed numbers for wards without live mock data (only Neuro Ward B is live). */
  mockFreeBeds?: number;
  mockOpenAlerts?: number;
}

export type BedStatus = 'occupied' | 'ready' | 'cleaning' | 'reserved' | 'oos';

export interface Bed {
  id: number;
  status: BedStatus;
  /** When the bed entered its current status (ISO time). */
  since: string;
  cameraId: string;
  patientId?: string;
  /** Name of the queue patient the bed is held for (status "reserved"). */
  reservedFor?: string;
}

export type BedEventKind = 'admitted' | 'discharged' | 'cleaningStart' | 'cleaningDone' | 'markedReady' | 'oos' | 'reserved';

/** One line in a bed's history (D7). Cleaning events also form its cleaning log. */
export interface BedEvent {
  id: string;
  bedId: number;
  at: string;
  kind: BedEventKind;
  by: string;
  patient?: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  sex: 'F' | 'M';
  bedId?: number;
  allergies: string[];
  fallRisk: 'high' | 'medium' | 'low';
  summary: string;
}

export interface Staff {
  id: string;
  name: string;
  role: 'nurse' | 'senior' | 'doctor';
  beds: number[];
  openTasks: number;
  overdue: number;
}

export type AlertTier = 'critical' | 'high' | 'normal';
export type AlertKind = 'fall' | 'overdue' | 'visit' | 'bed' | 'request' | 'test';

/** Text stored as a translation key + values, so it switches language. Drug and person names stay as written. */
export interface Msg {
  key: string;
  vars?: Record<string, string | number>;
}

export interface Alert {
  id: string;
  tier: AlertTier;
  kind: AlertKind;
  title: Msg;
  detail: Msg;
  bedId?: number;
  at: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
}

export type Priority = 'P1' | 'P2' | 'P3';

export type QueueSource = 'emergency' | 'opd' | 'referral';
export type BedType = 'General' | 'ICU';

export interface UrgencyRequest {
  reason: string;
  at: string;
  status: 'open' | 'raised' | 'declined';
  /** What the patient sees in their Health Profile app. */
  answer?: string;
  answeredBy?: string;
}

export interface QueueEntry {
  id: string;
  name: string;
  phone?: string;
  age?: number;
  priority: Priority;
  source: QueueSource;
  bookedAt: string;
  bedType: BedType;
  urgencyRequest?: UrgencyRequest;
  /** Manager override: extra points with the reason, shown in "Why here?". */
  override?: { points: number; reason: string; by: string };
}

export interface AuditEntry {
  id: string;
  at: string;
  by: string;
  action: string;
  reason: string;
}
