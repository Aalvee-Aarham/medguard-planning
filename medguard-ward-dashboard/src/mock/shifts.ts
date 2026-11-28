// Shift planning (D14, D15). Rules from PLAN.md section 9 (defaults until the Admin Console sets them):
// 1 nurse : 6 patients on every shift, and at least 11 hours rest between shifts.
import type { ShiftCode, ShiftPlan, SwapRequest } from './types';

export const SHIFTS: Exclude<ShiftCode, 'off'>[] = ['M', 'E', 'N'];
/** Start and end hour of each shift, counted from midnight of its day (Night ends at 8 AM next day). */
export const SHIFT_HOURS: Record<Exclude<ShiftCode, 'off'>, [number, number]> = { M: [8, 14], E: [14, 22], N: [22, 32] };
export const MIN_REST_HOURS = 11;
export const PATIENTS_PER_NURSE = 6;

/** Nurses who can be put on the week plan (bigger than today's on-duty list). */
export const ROSTER = [
  { id: 's-rina', name: 'Nurse Rina Akter' },
  { id: 's-mitu', name: 'Nurse Mitu Das' },
  { id: 's-shahana', name: 'Sister Shahana Parvin' },
  { id: 'r-jui', name: 'Nurse Jui Barua' },
  { id: 'r-taslima', name: 'Nurse Taslima Akter' },
  { id: 'r-rumana', name: 'Nurse Rumana Haque' },
  { id: 'r-polash', name: 'Nurse Polash Roy' },
  { id: 'r-nadia', name: 'Nurse Nadia Islam' },
  { id: 'r-sumi', name: 'Nurse Sumi Chakma' },
];
export const rosterName = (id: string) => ROSTER.find((r) => r.id === id)?.name ?? id;

/** Monday of next week, as an ISO date. */
export function nextMonday(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return d.toISOString();
}

export const dayDate = (weekStart: string, day: number) => {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + day);
  return d;
};

export type Warning =
  | { kind: 'rest'; nurseId: string; day: number; hours: number; from: ShiftCode; to: ShiftCode }
  | { kind: 'cover'; day: number; shift: Exclude<ShiftCode, 'off'>; have: number; need: number };

export const nursesNeeded = (patients: number) => Math.max(1, Math.ceil(patients / PATIENTS_PER_NURSE));

/** Every rule the plan breaks. A rest warning sits on the second of the two shifts. */
export function checkPlan(cells: ShiftPlan['cells'], patients: number): Warning[] {
  const out: Warning[] = [];
  const need = nursesNeeded(patients);
  for (const [nurseId, week] of Object.entries(cells)) {
    for (let d = 1; d < week.length; d++) {
      const a = week[d - 1];
      const b = week[d];
      if (a === 'off' || b === 'off') continue;
      const rest = 24 + SHIFT_HOURS[b][0] - SHIFT_HOURS[a][1];
      if (rest < MIN_REST_HOURS) out.push({ kind: 'rest', nurseId, day: d, hours: rest, from: a, to: b });
    }
  }
  for (let d = 0; d < 7; d++) {
    for (const s of SHIFTS) {
      const have = Object.values(cells).filter((w) => w[d] === s).length;
      if (have < need) out.push({ kind: 'cover', day: d, shift: s, have, need });
    }
  }
  return out;
}

/**
 * "AI" proposal: a fair rotation (everyone gets 4–6 shifts, Morning → Evening → Night → days off), which
 * always covers 2 nurses per shift and respects rest. Real rosters are rarely perfect, so it keeps one
 * swap that a person has to look at: the plan arrives with exactly one rest warning to fix.
 */
export function proposePlan(patients: number): ShiftPlan['cells'] {
  const pattern: ShiftCode[] = ['M', 'M', 'E', 'E', 'N', 'N', 'off', 'off', 'off'];
  const cells: ShiftPlan['cells'] = {};
  ROSTER.forEach((r, i) => { cells[r.id] = Array.from({ length: 7 }, (_, d) => pattern[(i * 8 + d) % pattern.length]); });

  // Keep one same-day swap between two nurses that leaves exactly one rest warning.
  const ids = ROSTER.map((r) => r.id);
  for (let d = 1; d < 7; d++) {
    for (const a of ids) {
      for (const b of ids) {
        if (a >= b || cells[a][d] === cells[b][d]) continue;
        const trial = structuredClone(cells);
        [trial[a][d], trial[b][d]] = [trial[b][d], trial[a][d]];
        if (checkPlan(trial, patients).length === 1) return trial;
      }
    }
  }
  return cells;
}

/** The plan after a swap request is approved: the two nurses trade that day's shifts. */
export function applySwap(cells: ShiftPlan['cells'], req: Pick<SwapRequest, 'fromId' | 'toId' | 'day'>) {
  const next = structuredClone(cells);
  [next[req.fromId][req.day], next[req.toId][req.day]] = [next[req.toId][req.day], next[req.fromId][req.day]];
  return next;
}

export const initialSwaps = (): SwapRequest[] => [
  { id: 'sw-1', fromId: 's-mitu', toId: 'r-jui', day: 3, reason: 'Family wedding in Chattogram that evening.', at: new Date(Date.now() - 50 * 60_000).toISOString(), status: 'open' },
  { id: 'sw-2', fromId: 's-rina', toId: 'r-taslima', day: 5, reason: 'Exam for my nursing diploma.', at: new Date(Date.now() - 20 * 60_000).toISOString(), status: 'open' },
];
