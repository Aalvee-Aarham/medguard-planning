// Full-page layout for D1 Login and D2 Choose ward: logo top left, controls top right, centred card.
import { ShieldPlus } from 'lucide-react';
import type { ReactNode } from 'react';
import { useT } from '../../state/store';

export function AuthLayout({ children, aside, wide }: { children: ReactNode; aside?: ReactNode; wide?: boolean }) {
  const t = useT();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-between border-b border-border-subtle bg-surface px-8">
        <div className="flex items-center gap-2">
          <ShieldPlus size={24} strokeWidth={1.75} aria-hidden className="text-primary-600" />
          <span className="font-bold text-primary-700">{t('app.name')}</span>
          <span className="text-ink-700">{t('app.subtitle')}</span>
        </div>
        {aside}
      </header>
      <main className="flex flex-1 items-start justify-center px-8 py-16">
        <div className={`w-full rounded-card border border-border-subtle bg-surface p-8 ${wide ? 'max-w-3xl' : 'max-w-md'}`}>{children}</div>
      </main>
    </div>
  );
}
