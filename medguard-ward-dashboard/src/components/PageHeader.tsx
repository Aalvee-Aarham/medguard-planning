import { ArrowLeft, BedDouble, HeartPulse, ShieldPlus, Stethoscope } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useParallax } from '../utils/motion';

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Buttons on the right. */
  actions?: ReactNode;
  back?: { to: string; label: string };
  /** Simple blue line illustration on the right that drifts with scroll (dashboard headers only). */
  illustration?: boolean;
}

/** Blue line icons in three layers; each moves at its own speed as the page scrolls. Decorative only. */
function HeaderIllustration() {
  const box = useRef<HTMLDivElement>(null);
  useParallax(box);
  return (
    <div ref={box} aria-hidden className="pointer-events-none relative hidden h-16 w-48 shrink-0 xl:block">
      <div data-speed="0.6" className="absolute left-0 top-6 text-primary-100"><BedDouble size={40} strokeWidth={1.5} /></div>
      <div data-speed="0.3" className="absolute left-16 top-0 text-primary-600"><ShieldPlus size={32} strokeWidth={1.5} /></div>
      <div data-speed="0.9" className="absolute left-28 top-8 text-primary-100"><Stethoscope size={32} strokeWidth={1.5} /></div>
      <div data-speed="0.45" className="absolute right-0 top-1 text-primary-600"><HeartPulse size={28} strokeWidth={1.5} /></div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, back, illustration }: Props) {
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
        {(actions || illustration) && (
          <div className="flex items-center gap-2">
            {illustration && <HeaderIllustration />}
            {actions}
          </div>
        )}
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
