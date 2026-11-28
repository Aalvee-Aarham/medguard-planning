// Loading, empty, error, no access and server banner: every screen uses these (PLAN.md section 10).
import { Inbox, RefreshCw, ServerOff, ShieldX, AlertCircle, type LucideIcon } from 'lucide-react';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useParallax } from '../utils/motion';
import { useStore, useT } from '../state/store';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-control bg-border-subtle ${className}`} />;
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-2 p-4">
      <Skeleton className="h-8 w-1/3" />
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-10" />)}
    </div>
  );
}

function StateBox({ icon: Icon, tone, title, body, children }: { icon: LucideIcon; tone: string; title: string; body?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className={`flex h-12 w-12 items-center justify-center rounded-full ${tone}`}>
        <Icon size={24} strokeWidth={1.75} aria-hidden />
      </div>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      {body && <p className="mt-1 max-w-md text-ink-700">{body}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

/** Simple blue line illustration for empty states: the icon inside thin rings that drift apart on scroll. */
function EmptyIllustration() {
  const box = useRef<HTMLDivElement>(null);
  useParallax(box);
  return (
    <div ref={box} aria-hidden className="relative flex h-24 w-24 items-center justify-center">
      <div data-speed="-0.3" className="absolute inset-0 rounded-full border border-primary-100" />
      <div data-speed="0.2" className="absolute inset-3 rounded-full border border-dashed border-primary-100" />
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-primary-600 bg-surface text-primary-600">
        <Inbox size={24} strokeWidth={1.5} />
      </span>
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <EmptyIllustration />
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      {body && <p className="mt-1 max-w-md text-ink-700">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const t = useT();
  return (
    <StateBox icon={AlertCircle} tone="bg-danger-bg text-danger-text" title={t('state.error')} body={t('state.errorBody')}>
      <button type="button" onClick={onRetry} className="btn-secondary">
        <RefreshCw size={16} aria-hidden /> {t('state.retry')}
      </button>
    </StateBox>
  );
}

export function NoAccess() {
  const t = useT();
  return (
    <div className="rounded-card border border-border-subtle bg-surface">
      <StateBox icon={ShieldX} tone="bg-neutral-bg text-neutral-text" title={t('state.noAccess')} body={t('state.noAccessBody')}>
        <Link to="/queue" className="btn-primary">{t('state.goQueue')}</Link>
      </StateBox>
    </div>
  );
}

export function ServerBanner() {
  const { serverDown } = useStore();
  const t = useT();
  if (!serverDown) return null;
  return (
    <div role="alert" className="flex items-center gap-2 border-b border-warning-border bg-warning-bg px-8 py-3 text-warning-text">
      <ServerOff size={20} strokeWidth={1.75} aria-hidden />
      <span className="font-semibold">{t('server.banner')}</span>
    </div>
  );
}
