// Incidents (D16, D17), dose compliance (D18) and pilot metrics (D19).
// 4 weeks of history, made with a fixed seed so every run shows the same numbers.
// "Before" baseline numbers are worse than "after" (PLAN.md section 8).
import { PATIENTS, minsAgo } from './data';
import type { Incident } from './types';

/** Seconds the nurse's alarm waits for "I am going" before it escalates to the ward manager. */
export const ESCALATE_AFTER_SECS = 10;

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

const NURSES = ['Nurse Rina Akter', 'Nurse Mitu Das', 'Sister Shahana Parvin', 'Nurse Jui Barua', 'Nurse Taslima Akter'];
const FALL_OUTCOMES = ['outcome.noInjury', 'outcome.minorBruise', 'outcome.noInjuryXray', 'outcome.falseAlarm'];
const MISSED_OUTCOMES = ['outcome.givenLate', 'outcome.held', 'outcome.refused'];
const DRUGS = ['Levetiracetam 500 mg oral', 'Haloperidol 0.5 mg oral', 'Levodopa 100 mg oral', 'Insulin 10 units SC', 'Ceftriaxone 1 g IV'];

const at = (base: string, secs: number) => new Date(new Date(base).getTime() + secs * 1000).toISOString();

export function initialIncidents(): Incident[] {
  const rand = seeded(42);
  const list: Incident[] = [];
  // Today's fall at Bed 7 (matches the alert and the camera event).
  const sent = minsAgo(95);
  list.push({
    id: 'INC-1', kind: 'fall', bedId: 7, patient: 'Rahima Begum', at: sent, status: 'resolved', responseSecs: 48,
    timeline: [
      { step: 'sent', at: sent, by: 'CAM-02' },
      { step: 'acknowledged', at: at(sent, 48), by: 'Nurse Rina Akter' },
      { step: 'resolved', at: at(sent, 14 * 60), by: 'Nurse Rina Akter' },
    ],
    outcome: 'outcome.noInjury', notes: 'Helped back to bed, BP 130/85, neuro checks normal. Bed rails up, call bell in reach.',
  });

  for (let i = 2; i <= 22; i++) {
    const fall = i % 3 === 0;
    const minutesAgo = Math.round(60 * (6 + rand() * 24 * 27));
    const start = minsAgo(minutesAgo);
    const patient = PATIENTS[Math.floor(rand() * PATIENTS.length)];
    const bedId = patient.bedId ?? 6;
    const nurse = NURSES[Math.floor(rand() * NURSES.length)];
    // Older incidents (before the pilot's second half) answer more slowly.
    const older = minutesAgo > 60 * 24 * 14;
    const escalated = fall && rand() < (older ? 0.6 : 0.25);
    const response = fall ? Math.round((older ? 120 : 30) + rand() * (older ? 240 : 60)) : Math.round(15 * 60 + rand() * 50 * 60);
    const timeline: Incident['timeline'] = [{ step: 'sent', at: start, by: fall ? (bedId <= 5 ? 'CAM-01' : 'CAM-02') : 'Ward app' }];
    if (escalated) timeline.push({ step: 'escalated', at: at(start, ESCALATE_AFTER_SECS), by: 'Habib Rahman' });
    timeline.push({ step: 'acknowledged', at: at(start, response), by: escalated && rand() < 0.5 ? 'Habib Rahman' : nurse });
    timeline.push({ step: 'resolved', at: at(start, response + 600 + Math.round(rand() * 1800)), by: nurse });
    list.push({
      id: `INC-${i}`, kind: fall ? 'fall' : 'missed', bedId, patient: patient.name, at: start, status: 'resolved',
      responseSecs: response,
      drug: fall ? undefined : DRUGS[Math.floor(rand() * DRUGS.length)],
      timeline,
      outcome: fall ? FALL_OUTCOMES[Math.floor(rand() * FALL_OUTCOMES.length)] : MISSED_OUTCOMES[Math.floor(rand() * MISSED_OUTCOMES.length)],
    });
  }
  return list.sort((a, b) => b.at.localeCompare(a.at));
}

export interface DoseCount { label: string; onTime: number; late: number; missed: number }

/** Dose compliance for the last `days` days, split three ways (D18). */
export function doseStats(days: 7 | 28) {
  const rand = seeded(days === 7 ? 7 : 28);
  const scale = days / 7;
  const make = (label: string, base: number, onTimeRate: number): DoseCount => {
    const total = Math.round(base * scale * (0.9 + rand() * 0.2));
    const onTime = Math.round(total * (onTimeRate + (rand() - 0.5) * 0.03));
    const missed = Math.max(0, Math.round(total * (0.01 + rand() * 0.025)));
    return { label, onTime, late: total - onTime - missed, missed };
  };
  return {
    byNurse: [
      make('Nurse Rina Akter', 140, 0.88), make('Nurse Mitu Das', 95, 0.94), make('Sister Shahana Parvin', 40, 0.96),
      make('Nurse Jui Barua', 80, 0.92), make('Nurse Taslima Akter', 75, 0.9),
    ],
    byDrug: DRUGS.map((d, i) => make(d, [70, 45, 60, 85, 30][i], [0.93, 0.9, 0.86, 0.92, 0.95][i])),
    byTime: ['6 AM', '8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM', '10 PM', '12 AM'].map((h, i) =>
      make(h, [30, 70, 35, 55, 30, 25, 60, 45, 40, 15][i], [0.9, 0.84, 0.94, 0.9, 0.93, 0.95, 0.88, 0.91, 0.93, 0.96][i])),
  };
}

export interface WeekPoint { week: string; turnoverHours: number; onTimePct: number; fallResponseSecs: number; pilot: boolean }

/** 8 weeks: 4 before the pilot, 4 with MedGuard (D19). */
export function pilotWeeks(): WeekPoint[] {
  const before = [
    [10.2, 82, 262], [9.4, 85, 238], [9.8, 83, 251], [8.9, 86, 249],
  ];
  const after = [
    [7.1, 88, 96], [6.0, 90, 71], [5.4, 92, 58], [5.2, 91, 52],
  ];
  return [...before, ...after].map(([turnoverHours, onTimePct, fallResponseSecs], i) => ({
    week: `W${i + 1}`, turnoverHours, onTimePct, fallResponseSecs, pilot: i >= 4,
  }));
}

export const average = (pts: WeekPoint[], key: 'turnoverHours' | 'onTimePct' | 'fallResponseSecs') =>
  Math.round((pts.reduce((s, p) => s + p[key], 0) / pts.length) * 10) / 10;
