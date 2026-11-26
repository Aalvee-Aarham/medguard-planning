// Mock cast, shared with the other 3 apps: Shanti Hospital, Dhaka · Neuro Ward B · 10 beds.
import type { Alert, Bed, Patient, QueueEntry, Staff, User, Ward } from './types';

export const minsAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

export const HOSPITAL = 'Shanti Hospital';

export const WARDS: Ward[] = [
  { id: 'neuro-b', name: 'Neuro Ward B', hospital: HOSPITAL, beds: 10 },
  { id: 'medicine-a', name: 'Medicine Ward A', hospital: HOSPITAL, beds: 16, mockFreeBeds: 3, mockOpenAlerts: 1 },
];

export const USERS: Record<User['role'], User> = {
  manager: { id: 'u-habib', name: 'Habib Rahman', role: 'manager' },
  desk: { id: 'u-salma', name: 'Salma Khatun', role: 'desk' },
  'manager-senior': { id: 'u-habib', name: 'Habib Rahman', role: 'manager-senior' },
};

export const PATIENTS: Patient[] = [
  { id: 'P-1001', name: 'Kamal Uddin', age: 47, sex: 'M', bedId: 1, allergies: [], fallRisk: 'low', summary: 'Migraine with aura, under observation' },
  { id: 'P-1002', name: 'Abdul Malek', age: 54, sex: 'M', bedId: 2, allergies: [], fallRisk: 'medium', summary: 'Post-stroke rehab, day 6' },
  { id: 'P-1004', name: 'Nasima Akhter', age: 39, sex: 'F', bedId: 4, allergies: ['Aspirin'], fallRisk: 'low', summary: 'Epilepsy, medicine review' },
  { id: 'P-1005', name: 'Fatema Khatun', age: 61, sex: 'F', bedId: 5, allergies: ['Sulfa'], fallRisk: 'medium', summary: 'Parkinson’s, dose adjustment' },
  { id: 'P-1007', name: 'Rahima Begum', age: 68, sex: 'F', bedId: 7, allergies: ['Penicillin'], fallRisk: 'high', summary: 'Ischaemic stroke, left-side weakness' },
  { id: 'P-1008', name: 'Shafiqul Islam', age: 72, sex: 'M', bedId: 8, allergies: [], fallRisk: 'high', summary: 'Dementia with delirium' },
  { id: 'P-1009', name: 'Monowara Begum', age: 58, sex: 'F', bedId: 9, allergies: ['Ibuprofen'], fallRisk: 'medium', summary: 'Guillain-Barré, recovering' },
  { id: 'P-1006', name: 'Jesmin Ara', age: 44, sex: 'F', allergies: [], fallRisk: 'low', summary: 'Discharged today from Bed 6' },
];

export const initialBeds = (): Bed[] => {
  const byBed = (n: number) => PATIENTS.find((p) => p.bedId === n)?.id;
  const cam = (n: number) => (n <= 5 ? 'CAM-01' : 'CAM-02');
  const plan: [number, Bed['status'], number][] = [
    [1, 'occupied', 60 * 26], [2, 'occupied', 60 * 140], [3, 'ready', 75],
    [4, 'occupied', 60 * 50], [5, 'occupied', 60 * 30], [6, 'cleaning', 25],
    [7, 'occupied', 60 * 72], [8, 'occupied', 60 * 20], [9, 'occupied', 60 * 96],
    [10, 'oos', 60 * 30],
  ];
  return plan.map(([id, status, mins]) => ({
    id, status, since: minsAgo(mins), cameraId: cam(id),
    patientId: status === 'occupied' ? byBed(id) : undefined,
  }));
};

export const STAFF: Staff[] = [
  { id: 's-rina', name: 'Nurse Rina Akter', role: 'nurse', beds: [1, 2, 4, 5, 7, 8, 9], openTasks: 5, overdue: 1 },
  { id: 's-mitu', name: 'Nurse Mitu Das', role: 'nurse', beds: [3, 6, 10], openTasks: 2, overdue: 0 },
  { id: 's-shahana', name: 'Sister Shahana Parvin', role: 'senior', beds: [], openTasks: 3, overdue: 0 },
  { id: 's-karim', name: 'Dr. Karim Hossain', role: 'doctor', beds: [], openTasks: 1, overdue: 0 },
];

export const QUEUE: QueueEntry[] = [
  { id: 'Q-1', name: 'Jahid Islam', priority: 'P1', source: 'emergency', bookedAt: minsAgo(6 * 60), bedType: 'General' },
  {
    id: 'Q-2', name: 'Rokeya Sultana', priority: 'P2', source: 'opd', bookedAt: minsAgo(14 * 60), bedType: 'General',
    urgencyRequest: { reason: 'Headache is getting worse and I cannot keep food down.', status: 'open' },
  },
  { id: 'Q-3', name: 'Mizanur Rahman', priority: 'P3', source: 'referral', bookedAt: minsAgo(2 * 24 * 60), bedType: 'ICU' },
];

export const initialAlerts = (): Alert[] => [
  {
    id: 'a-1', tier: 'high', kind: 'overdue', bedId: 4, at: minsAgo(25), acknowledged: false,
    title: { key: 'alert.overdue.title', vars: { bed: 4 } },
    detail: { key: 'alert.overdue.detail', vars: { drug: 'Levetiracetam 500 mg oral', mins: 25, nurse: 'Nurse Rina Akter' } },
  },
  {
    id: 'a-2', tier: 'high', kind: 'overdue', bedId: 8, at: minsAgo(10), acknowledged: false,
    title: { key: 'alert.overdue.title', vars: { bed: 8 } },
    detail: { key: 'alert.overdue.detail', vars: { drug: 'Haloperidol 0.5 mg oral', mins: 10, nurse: 'Nurse Rina Akter' } },
  },
  {
    id: 'a-3', tier: 'normal', kind: 'request', at: minsAgo(40), acknowledged: false,
    title: { key: 'alert.request.title', vars: { name: 'Rokeya Sultana' } },
    detail: { key: 'alert.request.detail', vars: { hours: 14 } },
  },
  {
    id: 'a-4', tier: 'critical', kind: 'fall', bedId: 7, at: minsAgo(95), acknowledged: true, acknowledgedBy: 'Nurse Rina Akter',
    title: { key: 'alert.fall.title', vars: { bed: 7 } },
    detail: { key: 'alert.fall.detail', vars: { patient: 'Rahima Begum', nurse: 'Nurse Rina Akter', secs: 48 } },
  },
];
