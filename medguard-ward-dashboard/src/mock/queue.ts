// Queue ranking (PLAN.md section 9, default until the team decides):
// score = emergency level (P1 60 / P2 35 / P3 10) + hours waiting (1 pt/h, max 30) + booking order (0–10).
// An urgency request adds no points: it only flags the patient; the manager decides.
// A manager override adds the points needed to move a patient up, and is shown with its reason.
import type { Priority, QueueEntry } from './types';

export const PRIORITY_POINTS: Record<Priority, number> = { P1: 60, P2: 35, P3: 10 };
export const MAX_WAIT_POINTS = 30;
export const MAX_BOOKING_POINTS = 10;
const BOOKING_STEP = 3;

export interface ScoreParts {
  priority: number;
  wait: number;
  hours: number;
  booking: number;
  override: number;
  total: number;
}

export interface Ranked {
  entry: QueueEntry;
  rank: number;
  score: ScoreParts;
}

export const hoursWaiting = (entry: QueueEntry, now: number) =>
  Math.max(0, Math.floor((now - new Date(entry.bookedAt).getTime()) / 3_600_000));

export function rankQueue(entries: QueueEntry[], now: number): Ranked[] {
  // Earliest booking gets the most booking points.
  const byBooking = [...entries].sort((a, b) => a.bookedAt.localeCompare(b.bookedAt));
  const scored = entries.map((entry) => {
    const hours = hoursWaiting(entry, now);
    const priority = PRIORITY_POINTS[entry.priority];
    const wait = Math.min(MAX_WAIT_POINTS, hours);
    const booking = Math.max(0, MAX_BOOKING_POINTS - BOOKING_STEP * byBooking.indexOf(entry));
    const override = entry.override?.points ?? 0;
    return { entry, score: { priority, wait, hours, booking, override, total: priority + wait + booking + override } };
  });
  scored.sort((a, b) => b.score.total - a.score.total || a.entry.bookedAt.localeCompare(b.entry.bookedAt));
  return scored.map((s, i) => ({ ...s, rank: i + 1 }));
}

/** Points to add so `mover` ranks just above `target`. */
export function pointsToMoveAbove(mover: Ranked, target: Ranked) {
  const withoutOverride = mover.score.total - mover.score.override;
  return target.score.total - withoutOverride + 1;
}

export const raise = (p: Priority): Priority => (p === 'P3' ? 'P2' : 'P1');
