import { Children, cloneElement, isValidElement, useEffect, useId, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, FormEvent, ReactElement, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, AlertTriangle, CheckCircle2, Circle, Clock, Inbox, Info, X, XCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useI18n } from '../i18n'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Tone = 'info' | 'success' | 'warning' | 'danger'

export function Button({ variant = 'primary', type = 'button', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={`button button-${variant} ${className}`} {...props} />
}

export function PageHeader({ title, description, actions, eyebrow }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <header className="page-header" data-page-heading>
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="actions page-actions">{actions}</div>}
    </header>
  )
}

export function Card({ children, className = '', title, description, actions }: { children: ReactNode; className?: string; title?: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <section className={`card ${className}`}>
      {(title || description || actions) && (
        <header className="card-header">
          <div>
            {title && <h2>{title}</h2>}
            {description && <p className="muted">{description}</p>}
          </div>
          {actions && <div className="actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

type FieldControlProps = { id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }

export function Field({ label, children, error, hint, htmlFor }: { label: ReactNode; children: ReactNode; error?: ReactNode; hint?: ReactNode; htmlFor?: string }) {
  const generatedId = useId()
  const child = Children.count(children) === 1 && isValidElement<FieldControlProps>(children) ? children : null
  const controlId = htmlFor ?? child?.props.id ?? generatedId
  const feedbackId = `${controlId}-feedback`
  const description = [child?.props['aria-describedby'], (error || hint) && feedbackId].filter(Boolean).join(' ')
  const control: ReactNode = child
    ? cloneElement(child as ReactElement<FieldControlProps>, {
      id: controlId,
      'aria-invalid': error ? true : child.props['aria-invalid'],
      'aria-describedby': description || undefined,
    })
    : children

  return (
    <div className={`field${error ? ' field-error' : ''}`}>
      <label htmlFor={controlId}>{label}</label>
      {control}
      {error && <p id={feedbackId} className="field-message" role="alert"><AlertCircle aria-hidden="true" />{error}</p>}
      {!error && hint && <p id={feedbackId} className="field-hint">{hint}</p>}
    </div>
  )
}

export function Modal({ title, children, onClose }: { title: ReactNode; children: ReactNode; onClose?: () => void }) {
  const { t } = useI18n()
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    element.showModal()
    return () => element.close()
  }, [])

  return createPortal(
    <dialog
      ref={dialog}
      className="modal"
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose?.() }}
    >
      <div className="modal-header">
        <h2 id={titleId}>{title}</h2>
        {onClose && <Button variant="ghost" className="icon-button" onClick={onClose} aria-label={t('Close')}><X aria-hidden="true" /></Button>}
      </div>
      {children}
    </dialog>,
    document.body,
  )
}

export function ReasonDialog({ title, description, confirmLabel, onConfirm, onClose, danger = true }: {
  title: string; description: string; confirmLabel: string; onConfirm: (reason: string) => void; onClose: () => void; danger?: boolean
}) {
  const { t } = useI18n()
  const [reason, setReason] = useState('')
  const [invalid, setInvalid] = useState(false)

  function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    event.stopPropagation()
    const normalizedReason = reason.trim()
    if (!normalizedReason) { setInvalid(true); return }
    onConfirm(normalizedReason)
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form className="stack" onSubmit={confirm} noValidate>
        <p className="muted">{description}</p>
        <Field label={t('Reason')} error={invalid ? t('Enter a reason to continue.') : undefined}>
          <textarea value={reason} rows={3} maxLength={500} required autoFocus onChange={(event) => {
            setReason(event.target.value)
            if (event.target.value.trim()) setInvalid(false)
          }} />
        </Field>
        <div className="dialog-actions">
          <Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant={danger ? 'danger' : 'primary'}>{confirmLabel}</Button>
        </div>
      </form>
    </Modal>
  )
}

const toneIcons: Record<Tone, LucideIcon> = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: AlertCircle }

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: Tone }) {
  const Icon = toneIcons[tone]
  return <div className={`notice tone-${tone}`} role={tone === 'danger' ? 'alert' : 'status'}><Icon aria-hidden="true" /><div>{children}</div></div>
}

const statusTones: Record<string, Tone | 'neutral'> = {
  Active: 'success', Online: 'success', Healthy: 'success', Reviewed: 'success', Verified: 'success', Paid: 'success',
  Available: 'success', Passed: 'success', Connected: 'success', 'In service': 'success',
  Invited: 'info', Onboarding: 'info',
  Offline: 'warning', Pending: 'warning', Attention: 'warning', Due: 'warning',
  Deactivated: 'neutral', 'Out of service': 'neutral', Disabled: 'neutral',
  Critical: 'danger', Escalated: 'danger', Locked: 'danger', Failed: 'danger', Unverified: 'warning',
}

export function StatusChip({ status }: { status: string }) {
  const { t } = useI18n()
  const tone = statusTones[status] ?? 'neutral'
  const Icon = { success: CheckCircle2, info: Info, warning: Clock, danger: XCircle, neutral: Circle }[tone]
  return <span className={`status-chip tone-${tone}`}><Icon aria-hidden="true" />{t(status)}</span>
}

export function StatTile({ label, value, icon: Icon, detail }: { label: ReactNode; value: ReactNode; icon?: LucideIcon; detail?: ReactNode }) {
  return (
    <article className="stat-tile" data-stat-tile>
      <div className="stat-label">{Icon && <span className="stat-icon"><Icon aria-hidden="true" /></span>}{label}</div>
      <div className="stat-value">{value}</div>
      {detail && <div className="muted">{detail}</div>}
    </article>
  )
}

export function EmptyState({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-icon" aria-hidden="true"><Inbox /></span>
      <h2>{title}</h2>
      {description && <p className="muted">{description}</p>}
      {action}
    </div>
  )
}

export function Skeleton({ label }: { label?: string }) {
  const { t } = useI18n()
  return (
    <div role="status" aria-label={label ?? t('Loading screen')} className="stack skeleton">
      <div aria-hidden="true" />
      <div aria-hidden="true" />
      <div aria-hidden="true" />
    </div>
  )
}
