import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Buttons on the right. */
  actions?: ReactNode;
  back?: { to: string; label: string };
}

export function PageHeader({ title, subtitle, actions, back }: Props) {
  return (
    <div className="mb-6">
      {back && (
        <Link to={back.to} className="mb-2 inline-flex h-10 items-center gap-1 text-sm font-semibold text-primary-600 hover:underline">
          <ArrowLeft size={16} aria-hidden /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle && <div className="mt-1 text-ink-700">{subtitle}</div>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/** White card with an optional title row, used for page sections. */
export function Card({ title, action, children, className = '' }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-card border border-border-subtle bg-surface ${className}`}>
      {title && (
        <div className="flex min-h-12 items-center justify-between gap-4 border-b border-border-subtle px-4 py-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
