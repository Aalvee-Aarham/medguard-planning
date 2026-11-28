// Status is always colour + icon + word (safety rule 7).
import { Ban, Bed, Bookmark, CircleCheck, Clock, OctagonAlert, Sparkles, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { BedStatus, Priority } from '../mock/types';
import { useT } from '../state/store';

export type Tone = 'info' | 'success' | 'warning' | 'danger' | 'neutral' | 'primary';

export const TONE_CLASSES: Record<Tone, string> = {
  info: 'bg-primary-50 text-primary-600 border-primary-100',
  success: 'bg-success-bg text-success-text border-success-border',
  warning: 'bg-warning-bg text-warning-text border-warning-border',
  danger: 'bg-danger-bg text-danger-text border-danger-border',
  neutral: 'bg-neutral-bg text-neutral-text border-border-subtle',
  primary: 'bg-primary-100 text-primary-700 border-primary-100',
};

export function Chip({ tone, icon: Icon, children }: { tone: Tone; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-1 text-sm font-semibold leading-4 ${TONE_CLASSES[tone]}`}>
      <Icon size={16} strokeWidth={1.75} aria-hidden />
      {children}
    </span>
  );
}

export const BED_STATUS: Record<BedStatus, { tone: Tone; icon: LucideIcon }> = {
  occupied: { tone: 'info', icon: Bed },
  ready: { tone: 'success', icon: CircleCheck },
  cleaning: { tone: 'warning', icon: Sparkles },
  reserved: { tone: 'primary', icon: Bookmark },
  oos: { tone: 'neutral', icon: Ban },
};

export function BedStatusChip({ status }: { status: BedStatus }) {
  const t = useT();
  const s = BED_STATUS[status];
  return <Chip tone={s.tone} icon={s.icon}>{t(`bed.${status}`)}</Chip>;
}

const PRIORITY: Record<Priority, { tone: Tone; icon: LucideIcon }> = {
  P1: { tone: 'danger', icon: OctagonAlert },
  P2: { tone: 'warning', icon: TriangleAlert },
  P3: { tone: 'neutral', icon: Clock },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const t = useT();
  const p = PRIORITY[priority];
  return <Chip tone={p.tone} icon={p.icon}>{t(`priority.${priority}`)}</Chip>;
}
