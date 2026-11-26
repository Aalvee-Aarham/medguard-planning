// Fake "live" ward: every few seconds something happens, so the dashboard moves.
// Pure function: the store calls it with a random number and the current time.
import { PATIENTS, STAFF } from './data';
import type { Alert, Bed } from './types';

export const LIVE_INTERVAL_MS = 8000;

const DRUGS = ['Metformin 500 mg oral', 'Amlodipine 5 mg oral', 'Insulin 10 units SC', 'Levodopa 100 mg oral', 'Ceftriaxone 1 g IV'];

export interface LiveEvent {
  alert?: Alert;
  bed?: Pick<Bed, 'id' | 'status' | 'since'>;
}

const nurseFor = (bedId: number) => STAFF.find((s) => s.beds.includes(bedId))?.name ?? 'Nurse Mitu Das';

export function nextLiveEvent(beds: Bed[], rand: number, at: string): LiveEvent {
  const id = `live-${at}`;
  const occupied = beds.filter((b) => b.status === 'occupied');
  const pick = <T,>(list: T[]) => list[Math.floor(rand * 997) % list.length];

  // A bed that was being cleaned becomes ready.
  const cleaning = beds.find((b) => b.status === 'cleaning');
  if (cleaning && rand < 0.2) {
    return {
      bed: { id: cleaning.id, status: 'ready', since: at },
      alert: { id, tier: 'normal', kind: 'bed', title: `Bed ${cleaning.id} ready`, detail: 'Cleaning finished. Bed can be assigned.', bedId: cleaning.id, at, acknowledged: false },
    };
  }

  if (occupied.length === 0) return {};
  const bed = pick(occupied);
  const patient = PATIENTS.find((p) => p.id === bed.patientId);

  if (rand < 0.5) {
    const late = 5 + Math.floor(rand * 40);
    return {
      alert: {
        id, tier: 'high', kind: 'overdue', title: `Overdue dose: Bed ${bed.id}`,
        detail: `${pick(DRUGS)}, ${late} min late · ${nurseFor(bed.id)}`, bedId: bed.id, at, acknowledged: false,
      },
    };
  }

  // Honest camera wording (safety rule 3): "Visit seen by camera", never "Dose verified".
  return {
    alert: {
      id, tier: 'normal', kind: 'visit', title: `Visit seen by camera: Bed ${bed.id}`,
      detail: `${nurseFor(bed.id)} at ${patient?.name ?? 'patient'}’s bed, ${1 + Math.floor(rand * 5)} min`, bedId: bed.id, at, acknowledged: false,
    },
  };
}
