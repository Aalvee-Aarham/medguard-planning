import type { ReactNode } from 'react'
import { AlertCircle, Lock, RefreshCw, type LucideIcon } from 'lucide-react'
import { useT } from '../i18n'
import { Button, cx } from './ui'
import { EmptyArt } from './art'
import type { LoadState } from '../mock/api'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('skeleton rounded-card', className)} />
}

/** Skeleton of a typical list screen: never a blank screen */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  const t = useT()
  return (
    <div role="status" aria-label={t('Loading')} className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-card border border-border-subtle bg-surface p-4">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/3 rounded-control" />
            <Skeleton className="h-3 w-1/3 rounded-control" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** One line + one action. A light blue line illustration with gentle parallax (README: empty states). */
export function EmptyState({ text, action, art = 'docs' }: { text: string; action?: ReactNode; art?: 'docs' | 'pills' | 'chat' | 'people' | 'bell' | 'search' }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-border-subtle bg-surface px-4 py-8 text-center">
      <EmptyArt kind={art} />
      <p className="max-w-xs text-body text-ink-700">{text}</p>
      {action}
    </div>
  )
}

/** What happened, Retry, and what was saved */
export function ErrorState({ onRetry, what, saved }: { onRetry: () => void; what?: string; saved?: string }) {
  const t = useT()
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-card border border-danger-border bg-danger-bg px-4 py-8 text-center">
      <AlertCircle className="size-8 text-danger-text" strokeWidth={1.75} aria-hidden />
      <p className="font-semibold text-danger-text">{what ?? t('This did not load. The server did not answer.')}</p>
      <p className="text-small text-ink-700">{saved ?? t('Nothing was lost. Your saved data is still on this phone.')}</p>
      <Button variant="secondary" icon={RefreshCw} onClick={onRetry}>
        {t('Retry')}
      </Button>
    </div>
  )
}

/** Wraps a screen body with loading / error handling */
export function Loadable({ state, retry, skeleton, children }: { state: LoadState; retry: () => void; skeleton?: ReactNode; children: ReactNode }) {
  if (state === 'loading') return <>{skeleton ?? <ListSkeleton />}</>
  if (state === 'error') return <ErrorState onRetry={retry} />
  return <>{children}</>
}

export function NoAccess({ owner }: { owner: string }) {
  const t = useT()
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-border-subtle bg-neutral-bg px-4 py-8 text-center text-neutral-text">
      <Lock className="size-8" strokeWidth={1.75} aria-hidden />
      <p className="font-semibold">{t('View only. Ask {name} to change this.', { name: owner })}</p>
    </div>
  )
}

export function FullMessage({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-primary-50 text-primary-600">
        <Icon className="size-8" strokeWidth={1.75} aria-hidden />
      </span>
      <h1 className="text-h1 font-semibold">{title}</h1>
      <p className="max-w-sm text-body text-ink-700">{body}</p>
      {action}
    </div>
  )
}
