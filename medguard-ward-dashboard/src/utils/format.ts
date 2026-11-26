// Dates "25 Nov 2026", times "8:05 AM", English digits even in Bangla (PLAN.md section 9).

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** "4 min", "3 h", "2 d" since the given time. */
export function since(iso: string, now = Date.now()) {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
}
