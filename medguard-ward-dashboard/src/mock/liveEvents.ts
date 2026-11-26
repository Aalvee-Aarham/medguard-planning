// Fake "live" ward: every few seconds something happens, so the dashboard moves.
// Pure function: the store calls it with a random number and the current time.
import { PATIENTS } from './data';
import type { Alert, Bed, Staff } from './types';

export const LIVE_INTERVAL_MS = 12_000;

const DRUGS = ['Metformin 500 mg oral', 'Amlodipine 5 mg oral', 'Insulin 10 units SC', 'Levodopa 100 mg oral', 'Ceftriaxone 1 g IV'];

export interface LiveEvent {
  alert?: Alert;
  bed?: Pick<Bed, 'id' | 'status' | 'since'>;
}

const nurseFor = (staff: Staff[], bedId: number) => staff.find((s) => s.beds.includes(bedId))?.name ?? 'Nurse Mitu Das';

export function nextLiveEvent(beds: Bed[], alerts: Alert[], staff: Staff[], rand: number, at: string): LiveEvent {
  const id = `live-${at}`;
  const pick = <T,>(list: T[]) => list[Math.floor(rand * 997) % list.length];

  // A bed that was being cleaned becomes ready.
  const cleaning = beds.find((b) => b.status === 'cleaning');
  if (cleaning && rand < 0.2) {
    return {
      bed: { id: cleaning.id, status: 'ready', since: at },
      alert: {
        id, tier: 'normal', kind: 'bed', bedId: cleaning.id, at, acknowledged: false,
        title: { key: 'alert.bedReady.title', vars: { bed: cleaning.id } },
        detail: { key: 'alert.bedReady.detail' },
      },
    };
  }

  const occupied = beds.filter((b) => b.status === 'occupied');
  if (occupied.length === 0) return {};

  // Only one open overdue alert per bed, so the panel does not fill with repeats.
  const alreadyOverdue = new Set(alerts.filter((a) => a.kind === 'overdue' && !a.acknowledged).map((a) => a.bedId));
  const canBeOverdue = occupied.filter((b) => !alreadyOverdue.has(b.id));

  if (rand < 0.5 && canBeOverdue.length > 0) {
    const bed = pick(canBeOverdue);
    return {
      alert: {
        id, tier: 'high', kind: 'overdue', bedId: bed.id, at, acknowledged: false,
        title: { key: 'alert.overdue.title', vars: { bed: bed.id } },
        detail: { key: 'alert.overdue.detail', vars: { drug: pick(DRUGS), mins: 5 + Math.floor(rand * 40), nurse: nurseFor(staff, bed.id) } },
      },
    };
  }

  // Honest camera wording (safety rule 3): "Visit seen by camera", never "Dose verified".
  const bed = pick(occupied);
  const patient = PATIENTS.find((p) => p.id === bed.patientId);
  return {
    alert: {
      id, tier: 'normal', kind: 'visit', bedId: bed.id, at, acknowledged: false,
      title: { key: 'alert.visit.title', vars: { bed: bed.id } },
      detail: { key: 'alert.visit.detail', vars: { nurse: nurseFor(staff, bed.id), patient: patient?.name ?? '', mins: 1 + Math.floor(rand * 5) } },
    },
  };
}
