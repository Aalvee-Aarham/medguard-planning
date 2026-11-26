import type { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  /** Small line under the number, e.g. "1 since 8 AM". */
  trend?: string;
}

export function StatTile({ label, value, icon: Icon, trend }: Props) {
  return (
    <div className="rounded-card border border-border-subtle bg-surface p-4">
      <div className="flex items-center gap-2 text-sm text-ink-700">
        <Icon size={20} strokeWidth={1.75} aria-hidden className="text-primary-600" />
        {label}
      </div>
      <div className="mt-2 text-[28px] font-bold leading-9 tabular-nums">{value}</div>
      {trend && <div className="mt-1 text-sm text-ink-500">{trend}</div>}
    </div>
  );
}
