import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, Clock, Sparkles, X } from 'lucide-react'
import { useT } from '../i18n'
import { useApp, LIMITS } from '../state/store'
import { Button, Textarea } from './ui'

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', k)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
}

/** Bottom sheet: grab handle, 16 px top radius, main button at the bottom in thumb reach */
export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const t = useT()
  const id = useId()
  useEscape(open, onClose)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (open) ref.current?.focus()
  }, [open])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <div className="fade-in absolute inset-0 bg-ink-900/40" onClick={onClose} aria-hidden />
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={id} className="sheet-in safe-bottom relative flex max-h-[90dvh] w-full max-w-[480px] flex-col rounded-t-sheet bg-surface shadow-float focus:outline-none md:max-w-[560px] md:rounded-sheet">
        <div className="flex justify-center pt-2 md:hidden" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-border-input" />
        </div>
        <div className="flex items-center gap-2 px-4 pt-2 pb-3">
          <h2 id={id} className="flex-1 text-h2 font-semibold">
            {title}
          </h2>
          <button type="button" aria-label={t('Close')} onClick={onClose} className="grid size-12 place-items-center rounded-full hover:bg-primary-50">
            <X className="size-6" strokeWidth={1.75} />
          </button>
        </div>
        <div className="overflow-y-auto px-4 pb-4">{children}</div>
        {footer && <div className="border-t border-border-subtle px-4 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

/**
 * Title names the action, body says the consequence, reason field when needed, Cancel left.
 * Never animated beyond the 200 ms fade (README safety rule).
 */
export function ConfirmDialog({
  open, onClose, title, body, confirmLabel, onConfirm, destructive, reason, reasonRequired, children,
}: {
  open: boolean
  onClose: () => void
  title: string
  body: ReactNode
  confirmLabel: string
  onConfirm: (reason: string) => void
  destructive?: boolean
  reason?: string
  reasonRequired?: boolean
  children?: ReactNode
}) {
  const t = useT()
  const id = useId()
  const [text, setText] = useState('')
  useEscape(open, onClose)
  useEffect(() => {
    if (open) setText('')
  }, [open])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/40" onClick={onClose} aria-hidden />
      <div role="alertdialog" aria-modal="true" aria-labelledby={id} className="relative w-full max-w-[420px] rounded-sheet bg-surface p-6 shadow-float">
        <h2 id={id} className="text-h2 font-semibold">
          {title}
        </h2>
        <div className="mt-2 text-body text-ink-700">{body}</div>
        {children}
        {reason && (
          <Textarea className="mt-4" label={reason} value={text} onChange={(e) => setText(e.target.value)} hint={reasonRequired ? t('Required') : t('Optional')} />
        )}
        <div className="mt-6 flex gap-3">
          <Button variant="secondary" full onClick={onClose}>
            {t('Cancel')}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'primary'}
            full
            disabled={reasonRequired && !text.trim()}
            onClick={() => {
              onConfirm(text.trim())
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** Toasts only confirm; 4 s; never for errors that need action */
export function Toast() {
  const { toastMsg } = useApp()
  if (!toastMsg) return null
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 lg:bottom-8 lg:pl-[248px]" role="status" aria-live="polite">
      <div className="fade-in flex max-w-[440px] items-center gap-2 rounded-card bg-ink-900 px-4 py-3 text-body font-semibold text-white shadow-float">
        <CheckCircle2 className="size-5 shrink-0 text-success-border" aria-hidden />
        {toastMsg}
      </div>
    </div>,
    document.body,
  )
}

/** H60 Limit reached: which limit, when it resets, Upgrade / Not now */
export function LimitSheet() {
  const { limitHit, setLimitHit } = useApp()
  const t = useT()
  const close = () => setLimitHit(null)
  const reset = new Date()
  reset.setMonth(reset.getMonth() + 1, 1)
  const what =
    limitHit === 'chats'
      ? t('You have used all {n} AI chats this month.', { n: LIMITS.free.chats })
      : limitHit === 'searches'
        ? t('You have used all {n} similar-case searches this month.', { n: LIMITS.free.searches })
        : t('The Free plan has room for {n} profiles.', { n: LIMITS.free.profiles })
  return (
    <Sheet
      open={!!limitHit}
      onClose={close}
      title={t('Free limit reached')}
      footer={
        <div className="flex flex-col gap-2">
          <Button full to="/premium" onClick={close} icon={Sparkles}>
            {t('See Premium')}
          </Button>
          <Button full variant="tertiary" onClick={close}>
            {t('Not now')}
          </Button>
        </div>
      }
    >
      <p className="text-body">{what}</p>
      {limitHit !== 'profiles' && (
        <p className="mt-3 flex items-center gap-2 text-body text-ink-700">
          <Clock className="size-5" aria-hidden />
          {t('Resets on 1 {month}.', { month: reset.toLocaleString('en', { month: 'short' }) })}
        </p>
      )}
      <p className="mt-3 text-body text-ink-700">{t('Premium is BDT 149 a month: unlimited chats and searches, 8 profiles, 10 GB.')}</p>
    </Sheet>
  )
}
