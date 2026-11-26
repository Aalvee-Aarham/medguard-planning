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
}

export type BedStatus = 'occupied' | 'ready' | 'cleaning' | 'reserved' | 'oos';

export interface Bed {
  id: number;
  status: BedStatus;
  /** When the bed entered its current status (ISO time). */
  since: string;
  cameraId: string;
  patientId?: string;
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

export interface Alert {
  id: string;
  tier: AlertTier;
  kind: AlertKind;
  title: string;
  detail: string;
  bedId?: number;
  at: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
}

export type Priority = 'P1' | 'P2' | 'P3';

export interface QueueEntry {
  id: string;
  name: string;
  priority: Priority;
  source: 'emergency' | 'opd' | 'referral';
  bookedAt: string;
  bedType: 'General' | 'ICU';
  urgencyRequest?: { reason: string; status: 'open' | 'raised' | 'declined'; answer?: string };
}

export interface AuditEntry {
  id: string;
  at: string;
  by: string;
  action: string;
  reason: string;
}
