import type {
  Account, AccessGrant, AccessLogEntry, Admission, Caregiver, ChatThread, Document, DoseLog, Invite,
  Medicine, Notification, Profile, RecordItem, SharedPatient, SimilarCase, Subscription, TestResult,
} from './types'

const DAY = 86400000
const now = () => Date.now()
const ago = (days: number, h = 10) => {
  const d = new Date(now() - days * DAY)
  d.setHours(h, 0, 0, 0)
  return d.toISOString()
}
/** "HH:MM" for a time that is `offsetMin` minutes from now, rounded to 5 min, so Home always has a dose due soon */
const hhmm = (offsetMin: number) => {
  const d = new Date(now() + offsetMin * 60000)
  d.setMinutes(Math.round(d.getMinutes() / 5) * 5, 0, 0)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export const SELF = 'p-arif'
export const MOTHER = 'p-rahima'

export function makeSeed() {
  const account: Account = {
    id: 'acc-arif', name: 'Arif Hasan', phone: '+880 1711 000000', email: 'arif@example.com',
    type: 'personal', pin: '1234', createdAt: ago(120),
  }

  const profiles: Profile[] = [
    { id: SELF, name: 'Arif Hasan', dob: '1992-03-14', sex: 'male', bloodGroup: 'B+', relation: 'self', role: 'owner' },
    {
      id: MOTHER, name: 'Rahima Begum', dob: '1964-07-02', sex: 'female', bloodGroup: 'O+', relation: 'mother', role: 'owner',
      dangerSigns: true,
    },
  ]

  const items: RecordItem[] = [
    { id: 'r1', profileId: SELF, section: 'conditions', title: 'Type 2 diabetes', detail: 'Diagnosed 2023', date: ago(400), source: { kind: 'doctor', by: 'Dr. Karim Hossain', at: ago(400) }, confirmed: true },
    { id: 'r2', profileId: SELF, section: 'vaccinations', title: 'COVID-19 booster', detail: 'Pfizer, dose 3', date: ago(300), source: { kind: 'self', by: 'you', at: ago(300) }, confirmed: true },
    { id: 'r3', profileId: SELF, section: 'lifestyle', title: 'Non-smoker', detail: 'Walks 30 min a day', date: ago(90), source: { kind: 'self', by: 'you', at: ago(90) }, confirmed: true },
    { id: 'r4', profileId: SELF, section: 'doctors', title: 'Dr. Karim Hossain', detail: 'Neurology · Dhanmondi chamber', date: ago(12), source: { kind: 'self', by: 'you', at: ago(12) }, confirmed: true },
    { id: 'r5', profileId: SELF, section: 'vitals', title: 'Blood pressure 124/82 mmHg', date: ago(5), source: { kind: 'self', by: 'you', at: ago(5) }, confirmed: true },

    { id: 'm1', profileId: MOTHER, section: 'allergies', title: 'Penicillin', detail: 'Rash and swelling', date: ago(800), source: { kind: 'hospital', by: 'Shanti Hospital', at: ago(40) }, confirmed: true },
    { id: 'm2', profileId: MOTHER, section: 'conditions', title: 'Ischaemic stroke', detail: 'Left side weakness', date: ago(40), source: { kind: 'hospital', by: 'Shanti Hospital', at: ago(40) }, confirmed: true, documentId: 'd4' },
    { id: 'm3', profileId: MOTHER, section: 'conditions', title: 'Type 2 diabetes', detail: 'Since 2015', date: ago(1500), source: { kind: 'ai', by: 'you', at: ago(12) }, confirmed: true, confidence: 0.94, documentId: 'd2' },
    { id: 'm4', profileId: MOTHER, section: 'conditions', title: 'High blood pressure', date: ago(900), source: { kind: 'self', by: 'Nasrin Akter', at: ago(30) }, confirmed: true },
    { id: 'm5', profileId: MOTHER, section: 'imaging', title: 'CT brain', detail: 'Small infarct, right MCA territory', date: ago(41), source: { kind: 'hospital', by: 'Shanti Hospital', at: ago(41) }, confirmed: true, documentId: 'd5' },
    { id: 'm6', profileId: MOTHER, section: 'prescriptions', title: 'Prescription, Dr. Karim Hossain', detail: '3 medicines', date: ago(12), source: { kind: 'doctor', by: 'Dr. Karim Hossain', at: ago(12) }, confirmed: true, documentId: 'd2' },
    { id: 'm7', profileId: MOTHER, section: 'surgeries', title: 'Cataract surgery, right eye', date: ago(1100), source: { kind: 'self', by: 'you', at: ago(60) }, confirmed: true },
    { id: 'm8', profileId: MOTHER, section: 'vitals', title: 'Blood pressure 152/94 mmHg', date: ago(1), source: { kind: 'hospital', by: 'Shanti Hospital', at: ago(1) }, confirmed: true },
    { id: 'm9', profileId: MOTHER, section: 'doctors', title: 'Dr. Karim Hossain', detail: 'Neurology', date: ago(12), source: { kind: 'doctor', by: 'Dr. Karim Hossain', at: ago(12) }, confirmed: true },
  ]

  const reminder = { on: true, days: [0, 1, 2, 3, 4, 5, 6], sound: 'Chime', tellCaregivers: false }
  const medicines: Medicine[] = [
    { id: 'med1', profileId: SELF, name: 'Metformin', dose: '500 mg', times: [hhmm(15), '20:00'], food: 'after', prescribedBy: 'Dr. Karim Hossain', start: ago(380), current: true, source: { kind: 'doctor', by: 'Dr. Karim Hossain', at: ago(380) }, documentId: 'd1', reminder },
    { id: 'med2', profileId: MOTHER, name: 'Aspirin', dose: '75 mg', times: [hhmm(-20)], food: 'after', prescribedBy: 'Dr. Karim Hossain', start: ago(40), current: true, source: { kind: 'hospital', by: 'Shanti Hospital', at: ago(40) }, documentId: 'd2', reminder: { ...reminder, tellCaregivers: true } },
    { id: 'med3', profileId: MOTHER, name: 'Atorvastatin', dose: '20 mg', times: ['21:00'], food: 'any', prescribedBy: 'Dr. Karim Hossain', start: ago(40), current: true, source: { kind: 'doctor', by: 'Dr. Karim Hossain', at: ago(12) }, documentId: 'd2', reminder },
    { id: 'med4', profileId: MOTHER, name: 'Amlodipine', dose: '5 mg', times: [hhmm(45)], food: 'before', prescribedBy: 'Dr. Karim Hossain', start: ago(200), end: ago(45), current: false, source: { kind: 'ai', by: 'you', at: ago(200) }, confirmed: true, confidence: 0.9, reminder: { ...reminder, on: false } },
  ]

  const doseLogs: DoseLog[] = []
  for (let d = 1; d <= 34; d++) {
    for (const m of medicines.filter((x) => x.current)) {
      const r = (d * 7 + m.id.length * 3) % 11
      const status = r === 0 ? 'missed' : r === 5 ? 'skipped' : 'taken'
      doseLogs.push({ id: `dl-${m.id}-${d}`, medicineId: m.id, profileId: m.profileId, due: ago(d, 8), status, at: status === 'taken' ? ago(d, 8) : undefined, reason: status === 'skipped' ? 'Felt sick' : undefined })
    }
  }

  const tests: TestResult[] = [
    { id: 't1', profileId: SELF, name: 'HbA1c', unit: '%', low: 4, high: 5.7, points: [{ date: ago(300), value: 7.8 }, { date: ago(200), value: 7.1 }, { date: ago(100), value: 6.6 }, { date: ago(12), value: 6.2, documentId: 'd1' }], source: { kind: 'ai', by: 'you', at: ago(12) }, confirmed: true, confidence: 0.97 },
    { id: 't2', profileId: MOTHER, name: 'Fasting glucose', unit: 'mmol/L', low: 3.9, high: 5.6, points: [{ date: ago(90), value: 8.4 }, { date: ago(60), value: 9.1 }, { date: ago(40), value: 11.2 }, { date: ago(12), value: 7.4, documentId: 'd3' }], source: { kind: 'ai', by: 'you', at: ago(12) }, confirmed: true, confidence: 0.92 },
    { id: 'tbp1', profileId: SELF, name: 'Blood pressure (systolic)', unit: 'mmHg', low: 90, high: 139, points: [{ date: ago(180), value: 134 }, { date: ago(120), value: 130 }, { date: ago(60), value: 127 }, { date: ago(5), value: 124 }], source: { kind: 'self', by: 'you', at: ago(5) }, confirmed: true },
    { id: 'tbp2', profileId: MOTHER, name: 'Blood pressure (systolic)', unit: 'mmHg', low: 90, high: 139, points: [{ date: ago(60), value: 146 }, { date: ago(41), value: 168 }, { date: ago(33), value: 138 }, { date: ago(12), value: 144 }, { date: ago(1), value: 152 }], source: { kind: 'hospital', by: 'Shanti Hospital', at: ago(1) }, confirmed: true },
    { id: 't3', profileId: MOTHER, name: 'Haemoglobin', unit: 'g/dL', low: 12, high: 15.5, points: [{ date: ago(120), value: 12.4 }, { date: ago(40), value: 11.3 }, { date: ago(12), value: 11.8, documentId: 'd3' }], source: { kind: 'ai', by: 'you', at: ago(12) }, confirmed: true, confidence: 0.88 },
  ]

  const documents: Document[] = [
    { id: 'd1', profileId: SELF, title: 'HbA1c report', kind: 'report', date: ago(12), pages: 1, seed: 1, source: { kind: 'self', by: 'you', at: ago(12) }, extracted: [{ label: 'HbA1c', value: '6.2 %', confidence: 0.97, confirmed: true }] },
    { id: 'd2', profileId: MOTHER, title: 'Prescription, Dr. Karim Hossain', kind: 'prescription', date: ago(12), pages: 1, seed: 2, source: { kind: 'self', by: 'you', at: ago(12) }, extracted: [{ label: 'Medicine', value: 'Aspirin 75 mg, once daily after food', confidence: 0.95, confirmed: true }, { label: 'Medicine', value: 'Atorvastatin 20 mg, at night', confidence: 0.91, confirmed: true }] },
    { id: 'd3', profileId: MOTHER, title: 'CBC and glucose', kind: 'report', date: ago(12), pages: 2, seed: 3, source: { kind: 'self', by: 'Nasrin Akter', at: ago(12) }, extracted: [{ label: 'Haemoglobin', value: '11.8 g/dL', confidence: 0.88, confirmed: true }, { label: 'Fasting glucose', value: '7.4 mmol/L', confidence: 0.92, confirmed: true }] },
    { id: 'd4', profileId: MOTHER, title: 'Discharge summary, Shanti Hospital', kind: 'discharge', date: ago(33), pages: 3, seed: 4, source: { kind: 'hospital', by: 'Shanti Hospital', at: ago(33) }, extracted: [{ label: 'Diagnosis', value: 'Ischaemic stroke', confidence: 1, confirmed: true }] },
    { id: 'd5', profileId: MOTHER, title: 'CT brain report', kind: 'imaging', date: ago(41), pages: 1, seed: 5, source: { kind: 'hospital', by: 'Shanti Hospital', at: ago(41) }, extracted: [{ label: 'Finding', value: 'Small infarct, right MCA territory', confidence: 1, confirmed: true }] },
    { id: 'd6', profileId: SELF, title: 'Prescription, Dr. Karim Hossain', kind: 'prescription', date: ago(380), pages: 1, seed: 6, source: { kind: 'doctor', by: 'Dr. Karim Hossain', at: ago(380) }, extracted: [{ label: 'Medicine', value: 'Metformin 500 mg, twice daily', confidence: 1, confirmed: true }] },
  ]

  const admissions: Admission[] = [
    { id: 'a1', profileId: MOTHER, hospital: 'Shanti Hospital', ward: 'Neuro Ward B', bed: 'Bed 7', from: ago(41), to: ago(33), summary: 'Admitted with sudden left-side weakness. CT showed a small infarct. Treated with aspirin and statin. Walking with support at discharge.', medicines: ['Aspirin 75 mg', 'Atorvastatin 20 mg'], results: ['CT brain: small infarct', 'Haemoglobin 11.3 g/dL'], source: { kind: 'hospital', by: 'Shanti Hospital', at: ago(33) } },
    { id: 'a2', profileId: MOTHER, hospital: 'Dhaka Medical College Hospital', ward: 'Eye Ward', bed: 'Bed 21', from: ago(1102), to: ago(1100), summary: 'Day-case cataract surgery, right eye. No complications.', medicines: ['Moxifloxacin eye drops'], results: [], source: { kind: 'hospital', by: 'Dhaka Medical College Hospital', at: ago(1100) } },
  ]

  const grants: AccessGrant[] = [
    { id: 'g1', profileId: MOTHER, who: 'Dr. Karim Hossain', kind: 'doctor', until: new Date(now() + 5 * DAY).toISOString(), sections: ['conditions', 'medicines', 'tests'] },
    { id: 'g2', profileId: MOTHER, who: 'Nasrin Akter', kind: 'caregiver', permission: 'manage' },
  ]

  const accessLog: AccessLogEntry[] = [
    { id: 'l1', profileId: MOTHER, who: 'Dr. Karim Hossain', action: 'viewed', at: ago(2, 11) },
    { id: 'l2', profileId: MOTHER, who: 'Nurse Rina, Shanti Hospital', action: 'added', at: ago(33, 16) },
    { id: 'l3', profileId: MOTHER, who: 'Nasrin Akter', action: 'edited', at: ago(30, 9) },
    { id: 'l4', profileId: MOTHER, who: 'Dr. Salma Rahman, Shanti Hospital', action: 'emergency', at: ago(41, 3), reason: 'Patient unconscious on arrival', emergencyId: 'e1' },
    { id: 'l5', profileId: SELF, who: 'Dr. Karim Hossain', action: 'viewed', at: ago(12, 18) },
  ]

  const caregivers: Caregiver[] = [
    { id: 'c1', profileId: MOTHER, name: 'Nasrin Akter', phone: '+880 1811 000000', permission: 'manage', status: 'active' },
  ]

  const chats: ChatThread[] = [
    { id: 'ch1', profileId: SELF, title: 'What does HbA1c 6.2 mean?', at: ago(3), messages: [
      { id: 'x1', from: 'user', text: 'What does HbA1c 6.2 mean?' },
      { id: 'x2', from: 'ai', text: 'HbA1c shows your average blood sugar over the last 3 months. Yours was 6.2 %, down from 7.8 % a year ago. The normal range on your report is 4 to 5.7 %.', cite: 'HbA1c report' },
    ] },
  ]

  const cases: SimilarCase[] = [
    { id: 's1', age: 64, sex: 'female', condition: 'Ischaemic stroke', matches: ['Stroke', 'Diabetes', 'Age 60–70'], summary: 'A 64-year-old woman with type 2 diabetes presented with left-sided weakness. CT showed a right MCA infarct.', treatment: 'Aspirin, statin, blood sugar control, physiotherapy from day 2.', outcome: 'Walked without support at 3 months. Mild hand weakness remained.', citation: 'PMC-Patients, case 7741203' },
    { id: 's2', age: 59, sex: 'female', condition: 'Ischaemic stroke', matches: ['Stroke', 'High blood pressure'], summary: 'A 59-year-old woman with long-standing high blood pressure had sudden slurred speech and arm weakness.', treatment: 'Antiplatelet therapy, blood pressure control, speech therapy.', outcome: 'Speech recovered fully in 6 weeks.', citation: 'PMC-Patients, case 6610984' },
    { id: 's3', age: 67, sex: 'male', condition: 'Stroke with diabetes', matches: ['Stroke', 'Diabetes', 'Haemoglobin low'], summary: 'A 67-year-old man with diabetes and mild anaemia had a small subcortical stroke.', treatment: 'Dual antiplatelet for 21 days, then aspirin alone. Iron supplements.', outcome: 'Independent at 6 months.', citation: 'PMC-Patients, case 5823317' },
    { id: 's4', age: 61, sex: 'female', condition: 'Type 2 diabetes', matches: ['Diabetes', 'Fasting glucose high'], summary: 'A 61-year-old woman with poorly controlled diabetes after a hospital stay.', treatment: 'Diet review, metformin dose adjusted, regular glucose checks.', outcome: 'HbA1c fell from 9.1 % to 7.0 % in 6 months.', citation: 'PMC-Patients, case 4402158' },
    { id: 's5', age: 70, sex: 'female', condition: 'Recurrent stroke', matches: ['Stroke', 'Age 60–70'], summary: 'A 70-year-old woman had a second stroke 8 months after the first, after stopping her medicines.', treatment: 'Medicines restarted, carer reminders set up.', outcome: 'No further stroke over 2 years of follow-up.', citation: 'PMC-Patients, case 8019376' },
  ]

  const notifications: Notification[] = [
    { id: 'n1', kind: 'processed', title: 'CBC and glucose is ready', body: '2 values read. Check them before they go into the record.', at: ago(12, 14), read: true, link: '/documents/d3', tier: 'normal' },
    { id: 'n2', kind: 'access', title: 'Dr. Karim Hossain opened Rahima’s profile', body: 'Viewed conditions, medicines and tests.', at: ago(2, 11), read: false, link: '/share/log', tier: 'high' },
    { id: 'n3', kind: 'hospital', title: 'Discharge summary added', body: 'Shanti Hospital added Rahima’s stay records.', at: ago(33, 16), read: true, link: '/admissions/a1', tier: 'normal' },
    { id: 'n4', kind: 'emergency', title: 'Emergency access to Rahima’s profile', body: 'Shanti Hospital, Dr. Salma Rahman, 3:00 AM.', at: ago(41, 3), read: true, link: '/share/emergency/e1', tier: 'high' },
  ]

  const subscription: Subscription = { plan: 'free', receipts: [] }

  const invites: Invite[] = [{ id: 'i1', from: 'Kamal Hasan', profileName: 'Kamal Hasan (uncle)', permission: 'view', status: 'pending' }]

  const sharedPatients: SharedPatient[] = [
    { id: 'sp1', profileId: MOTHER, name: 'Rahima Begum', age: 62, sex: 'female', until: new Date(now() + 5 * DAY).toISOString(), via: 'link' },
  ]

  return { account, profiles, items, medicines, doseLogs, tests, documents, admissions, grants, accessLog, caregivers, chats, cases, notifications, subscription, invites, sharedPatients }
}

export type Seed = ReturnType<typeof makeSeed>
