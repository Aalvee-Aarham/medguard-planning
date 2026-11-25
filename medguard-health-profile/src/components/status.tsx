import { useState } from 'react'
import { AlertTriangle, BadgeCheck, Building2, Check, CheckCircle2, Clock, CloudOff, Eye, Loader2, Minus, RefreshCw, Sparkles, Stethoscope, User, X, type LucideIcon } from 'lucide-react'
import { useT } from '../i18n'
import { useApp } from '../state/store'
import { fmtDate } from '../lib/format'
import type { RecordItem, Source } from '../mock/types'
import { cx } from './ui'

export type Status = 'taken' | 'skipped' | 'missed' | 'due' | 'next' | 'processing' | 'verified' | 'snoozed' | 'viewonly' | 'confirmed' | 'expired' | 'invited' | 'active' | 'failed'

const STATUS: Record<Status, { icon: LucideIcon; tone: string; label: string }> = {
  taken: { icon: Check, tone: 'bg-success-bg text-success-text', label: 'Taken' },
  confirmed: { icon: CheckCircle2, tone: 'bg-success-bg text-success-text', label: 'Confirmed' },
  verified: { icon: BadgeCheck, tone: 'bg-success-bg text-success-text', label: 'Verified' },
  active: { icon: Check, tone: 'bg-success-bg text-success-text', label: 'Active' },
  skipped: { icon: Minus, tone: 'bg-neutral-bg text-neutral-text', label: 'Skipped' },
  expired: { icon: Clock, tone: 'bg-neutral-bg text-neutral-text', label: 'Expired' },
  viewonly: { icon: Eye, tone: 'bg-neutral-bg text-neutral-text', label: 'View only' },
  missed: { icon: X, tone: 'bg-danger-bg text-danger-text', label: 'Missed' },
  failed: { icon: AlertTriangle, tone: 'bg-danger-bg text-danger-text', label: 'Failed' },
  due: { icon: Clock, tone: 'bg-warning-bg text-warning-text', label: 'Due now' },
  invited: { icon: Clock, tone: 'bg-warning-bg text-warning-text', label: 'Invited' },
  snoozed: { icon: Clock, tone: 'bg-warning-bg text-warning-text', label: 'Snoozed' },
  next: { icon: Clock, tone: 'bg-primary-50 text-primary-600', label: 'Next' },
  processing: { icon: Loader2, tone: 'bg-primary-50 text-primary-600', label: 'Processing' },
}

/** Status = colour + icon + word, always (safety rule 7). */
export function StatusChip({ status, label }: { status: Status; label?: string }) {
  const t = useT()
  const c = STATUS[status]
  const Icon = c.icon
  return (
    <span className={cx('inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-3 text-small font-semibold whitespace-nowrap', c.tone)}>
      <Icon className={cx('size-4', status === 'processing' && 'animate-spin')} strokeWidth={2} aria-hidden />
      {label ?? t(c.label)}
    </span>
  )
}

/** Red strip with the allergies, or a neutral "No known allergies". Never blank. Never animated. */
export function AllergyStrip({ profileId }: { profileId: string }) {
  const { s } = useApp()
  const t = useT()
  const list = s.items.filter((i) => i.profileId === profileId && i.section === 'allergies' && i.confirmed !== false)
  if (!list.length)
    return (
      <div className="flex min-h-12 items-center gap-2 rounded-card border border-border-subtle bg-neutral-bg px-4 py-2 text-neutral-text" role="note">
        <Check className="size-5 shrink-0" strokeWidth={2} aria-hidden />
        <span className="font-semibold">{t('No known allergies')}</span>
      </div>
    )
  return (
    <div className="flex min-h-12 items-center gap-2 rounded-card border border-danger-border bg-danger-bg px-4 py-2 text-danger-text" role="alert">
      <AlertTriangle className="size-5 shrink-0" strokeWidth={2} aria-hidden />
      <span className="font-semibold">
        {t('Allergies')}: {list.map((a) => a.title).join(', ')}
      </span>
    </div>
  )
}

/** "Uploaded by you, 12 Nov 2026" · "Added by Dr. Karim" · "From Shanti Hospital" */
export function SourceLabel({ source, className }: { source: Source; className?: string }) {
  const t = useT()
  const { icon: Icon, text } = sourceText(source, t)
  return (
    <span className={cx('inline-flex items-center gap-1 text-caption text-ink-700', className)}>
      <Icon className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
      {text}, {fmtDate(source.at)}
    </span>
  )
}

export function sourceText(src: Source, t: (k: string, v?: Record<string, string>) => string): { icon: LucideIcon; text: string } {
  switch (src.kind) {
    case 'doctor':
      return { icon: Stethoscope, text: t('Added by {name}', { name: src.by }) }
    case 'hospital':
      return { icon: Building2, text: t('From {name}', { name: src.by }) }
    case 'ai':
      return { icon: Sparkles, text: src.by === 'you' ? t('Read by AI, confirmed by you') : t('Read by AI, confirmed by {name}', { name: src.by }) }
    default:
      return { icon: User, text: src.by === 'you' ? t('Uploaded by you') : t('Added by {name}', { name: src.by }) }
  }
}

/** An AI-extracted field. Amber "AI read: check this" until confirmed; low confidence = check-bg + dashed border. */
export function AiField({
  label, value, confidence, confirmed, onChange, onConfirm, onViewOriginal,
}: {
  label: string
  value: string
  confidence: number
  confirmed: boolean
  onChange?: (v: string) => void
  onConfirm?: () => void
  onViewOriginal?: () => void
}) {
  const t = useT()
  const low = confidence < 0.8
  const [editing, setEditing] = useState(false)
  return (
    <div
      className={cx(
        'rounded-card border p-3',
        confirmed ? 'border-success-border bg-surface' : low ? 'border-2 border-dashed border-warning-border bg-check-bg' : 'border-border-subtle bg-surface',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-small font-semibold text-ink-700">{label}</span>
        {confirmed ? (
          <StatusChip status="confirmed" />
        ) : (
          <span className="inline-flex h-7 items-center gap-1 rounded-full bg-check-bg px-3 text-small font-semibold text-check-text">
            {low ? <AlertTriangle className="size-4" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
            {t('AI read: check this')}
          </span>
        )}
      </div>
      {editing && onChange ? (
        <input
          autoFocus
          aria-label={label}
          defaultValue={value}
          onBlur={(e) => {
            onChange(e.target.value)
            setEditing(false)
          }}
          className="mt-2 h-12 w-full rounded-control border-2 border-primary-600 px-3 text-body font-semibold focus:outline-none"
        />
      ) : (
        <p className="mt-1 text-body font-semibold text-ink-900">{value}</p>
      )}
      {low && !confirmed && <p className="mt-1 text-small text-check-text">{t('Hard to read. Compare with the original.')}</p>}
      {!confirmed && (
        <div className="mt-2 flex flex-wrap gap-2">
          {onChange && (
            <button type="button" onClick={() => setEditing(true)} className="btn min-h-10 rounded-control px-3 text-small font-semibold text-primary-600 hover:bg-primary-50">
              {t('Edit')}
            </button>
          )}
          {onViewOriginal && (
            <button type="button" onClick={onViewOriginal} className="btn min-h-10 rounded-control px-3 text-small font-semibold text-primary-600 hover:bg-primary-50">
              {t('View original')}
            </button>
          )}
          {onConfirm && (
            <button type="button" onClick={onConfirm} className="btn min-h-10 rounded-control border border-primary-600 px-3 text-small font-semibold text-primary-600 hover:bg-primary-50">
              {t('Looks right')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** Small tag on record rows that came from AI and are still unconfirmed */
export function ItemTags({ item }: { item: RecordItem }) {
  const t = useT()
  if (item.source.kind === 'ai' && !item.confirmed)
    return (
      <span className="inline-flex h-6 items-center gap-1 rounded-full bg-check-bg px-2 text-caption font-semibold text-check-text">
        <Sparkles className="size-3.5" aria-hidden />
        {t('AI read: check this')}
      </span>
    )
  return null
}

/** Offline banner under the top bar. Turns green "All synced" for 3 s when back. */
export function OfflineBanner() {
  const { online, justSynced, s } = useApp()
  const t = useT()
  if (justSynced)
    return (
      <div role="status" className="flex min-h-10 items-center gap-2 border-b border-success-border bg-success-bg px-4 py-2 text-small font-semibold text-success-text">
        <CheckCircle2 className="size-4" aria-hidden /> {t('All synced')}
      </div>
    )
  if (online) return null
  const n = s.queue.length
  return (
    <div role="status" className="flex min-h-10 items-center gap-2 border-b border-warning-border bg-warning-bg px-4 py-2 text-small font-semibold text-warning-text">
      {n ? <RefreshCw className="size-4" aria-hidden /> : <CloudOff className="size-4" aria-hidden />}
      {n ? t('Offline. {n} actions waiting to sync', { n }) : t('Offline. Viewing saved data')}
    </div>
  )
}

/** Small reason line under a greyed online-only button */
export function NeedsInternet() {
  const t = useT()
  return (
    <p className="mt-1 flex items-center gap-1 text-small text-ink-700">
      <CloudOff className="size-4" aria-hidden /> {t('Needs internet. Connect to use this.')}
    </p>
  )
}
