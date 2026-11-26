// Label + big number + short detail (PLAN.md section 5). Calm by default: grey icon, white card.
// tone="danger" only when the number needs attention (e.g. open alerts). Optional link or action.
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CountUp } from '../utils/motion';

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  /** Small line under the number, e.g. "1 ready · 1 cleaning". */
  trend?: string;
  tone?: 'neutral' | 'danger';
  /** Page the tile opens. */
  to?: string;
  /** Action instead of a link (e.g. open the alerts panel). */
  onClick?: () => void;
}

export function StatTile({ label, value, icon: Icon, trend, tone = 'neutral', to, onClick }: Props) {
  const danger = tone === 'danger';
  const body: ReactNode = (
    <>
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${danger ? 'bg-danger-bg text-danger-text' : 'bg-neutral-bg text-ink-700'}`}
        >
          <Icon size={20} strokeWidth={1.75} />
        </span>
        <span className="text-sm text-ink-700">{label}</span>
      </span>
      <span className={`mt-2 block text-[28px] font-bold leading-9 tabular-nums ${danger ? 'text-danger-text' : ''}`}>
        <CountUp value={value} />
      </span>
      {trend && <span className="mt-1 block text-sm text-ink-500">{trend}</span>}
    </>
  );
  const box = `block h-full w-full rounded-card border bg-surface p-4 text-left ${danger ? 'border-danger-border' : 'border-border-subtle'}`;
  const interactive = 'transition-colors duration-150 ease-out hover:border-primary-600';

  if (to) return <Link to={to} className={`${box} ${interactive}`}>{body}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={`${box} ${interactive}`}>{body}</button>;
  return <div className={box}>{body}</div>;
}
