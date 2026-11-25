import { forwardRef, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Loader2, type LucideIcon } from 'lucide-react'
import { useT } from '../i18n'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
export { cx }

type Variant = 'primary' | 'secondary' | 'tertiary' | 'destructive'
const VAR: Record<Variant, string> = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-700',
  secondary: 'bg-surface text-primary-600 border border-primary-600 hover:bg-primary-50',
  tertiary: 'text-primary-600 hover:bg-primary-50',
  destructive: 'bg-danger-text text-white hover:brightness-95',
}

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  full?: boolean
  loading?: boolean
  icon?: LucideIcon
  to?: string
  big?: boolean
}

/** Labels are verbs. One primary per screen. Loading keeps the label (theme prompt section 6). */
export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant = 'primary', full, loading, icon: Icon, to, big, className, children, disabled, onClick, ...rest },
  ref,
) {
  const nav = useNavigate()
  return (
    <button
      ref={ref}
      className={cx(
        'btn inline-flex items-center justify-center gap-2 rounded-control px-4 font-semibold text-body select-none',
        big ? 'min-h-14' : 'min-h-12',
        full && 'w-full',
        VAR[variant],
        'disabled:cursor-not-allowed disabled:opacity-100 disabled:bg-neutral-bg disabled:text-ink-500 disabled:border-border-subtle',
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={(e) => {
        onClick?.(e)
        if (to && !e.defaultPrevented) nav(to)
      }}
      {...rest}
    >
      {loading ? <Loader2 className="size-5 animate-spin" aria-hidden /> : Icon ? <Icon className="size-5" strokeWidth={1.75} aria-hidden /> : null}
      {children}
    </button>
  )
})

export function Card({ children, className, to, onClick, as }: { children: ReactNode; className?: string; to?: string; onClick?: () => void; as?: 'section' | 'div' | 'li' }) {
  const base = cx('block rounded-card border border-border-subtle bg-surface p-4', className)
  if (to)
    return (
      <Link to={to} className={cx(base, 'card-link')}>
        {children}
      </Link>
    )
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cx(base, 'card-link w-full text-left')}>
        {children}
      </button>
    )
  const Tag = as ?? 'div'
  return <Tag className={base}>{children}</Tag>
}

interface FieldProps {
  label: string
  hint?: string
  error?: string
  unit?: string
  children?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldProps>(function Input(
  { label, hint, error, unit, className, id, ...rest },
  ref,
) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <label htmlFor={fid} className="text-small font-semibold text-ink-700">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={fid}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${fid}-e` : hint ? `${fid}-h` : undefined}
          className={cx(
            'h-12 w-full rounded-control border bg-surface px-3 text-body text-ink-900 placeholder:text-ink-500 tabular',
            'focus:border-2 focus:border-primary-600 focus:outline-none focus:ring-4 focus:ring-primary-100',
            error ? 'border-danger-text border-2' : 'border-border-input',
            unit && 'pr-16',
          )}
          {...rest}
        />
        {unit && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-small text-ink-700">{unit}</span>}
      </div>
      {hint && !error && (
        <p id={`${fid}-h`} className="text-caption text-ink-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${fid}-e`} className="text-small text-danger-text" role="alert">
          {error}
        </p>
      )}
    </div>
  )
})

export function Textarea({ label, hint, className, id, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <label htmlFor={fid} className="text-small font-semibold text-ink-700">
        {label}
      </label>
      <textarea
        id={fid}
        rows={3}
        className="w-full rounded-control border border-border-input bg-surface px-3 py-3 text-body focus:border-2 focus:border-primary-600 focus:outline-none focus:ring-4 focus:ring-primary-100"
        {...rest}
      />
      {hint && <p className="text-caption text-ink-500">{hint}</p>}
    </div>
  )
}

export function Select({ label, className, id, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & FieldProps) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <label htmlFor={fid} className="text-small font-semibold text-ink-700">
        {label}
      </label>
      <select
        id={fid}
        className="h-12 w-full rounded-control border border-border-input bg-surface px-3 text-body focus:border-2 focus:border-primary-600 focus:outline-none focus:ring-4 focus:ring-primary-100"
        {...rest}
      >
        {children}
      </select>
    </div>
  )
}

export function Toggle({ label, checked, onChange, disabled, desc, locked }: { label: string; checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean; desc?: ReactNode; locked?: boolean }) {
  const id = useId()
  return (
    <div className="flex min-h-12 items-center gap-3 py-2">
      <div className="flex-1">
        <label htmlFor={id} className="text-body font-semibold">
          {label}
        </label>
        {desc && <div className="text-small text-ink-700">{desc}</div>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled || locked}
        onClick={() => onChange?.(!checked)}
        className={cx(
          'relative h-8 w-14 shrink-0 rounded-full transition-colors',
          checked ? 'bg-primary-600' : 'bg-border-input',
          (disabled || locked) && 'opacity-60',
        )}
      >
        <span className={cx('absolute top-1 size-6 rounded-full bg-surface transition-transform', checked ? 'left-1 translate-x-6' : 'left-1')} />
      </button>
    </div>
  )
}

export function Checkbox({ label, checked, onChange, children }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void; children?: ReactNode }) {
  const id = useId()
  return (
    <div className="flex gap-3 py-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-6 shrink-0 accent-primary-600"
      />
      <div className="flex-1">
        <label htmlFor={id} className="block min-h-6 text-body font-semibold">
          {label}
        </label>
        {children}
      </div>
    </div>
  )
}

export function Radio({ name, options, value, onChange, legend }: { name: string; legend: string; value: string; onChange: (v: string) => void; options: { value: string; label: ReactNode; desc?: ReactNode }[] }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-small font-semibold text-ink-700">{legend}</legend>
      {options.map((o) => (
        <label
          key={o.value}
          className={cx(
            'flex min-h-12 cursor-pointer items-center gap-3 rounded-control border bg-surface px-3 py-2',
            value === o.value ? 'border-2 border-primary-600 bg-primary-50' : 'border-border-input',
          )}
        >
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="size-5 accent-primary-600" />
          <span className="flex-1">
            <span className="block font-semibold">{o.label}</span>
            {o.desc && <span className="block text-small text-ink-700">{o.desc}</span>}
          </span>
        </label>
      ))}
    </fieldset>
  )
}

export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 rounded-control bg-neutral-bg p-1">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cx('min-h-10 flex-1 rounded-control px-3 text-small font-semibold transition-colors', value === t.value ? 'bg-surface text-primary-700 shadow-bar' : 'text-ink-700')}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

/** Screen header: back arrow + H1. One H1 per screen. */
export function PageHeader({ title, back = true, action, sub }: { title: string; back?: boolean | string; action?: ReactNode; sub?: ReactNode }) {
  const nav = useNavigate()
  const t = useT()
  return (
    <div className="mb-4 flex items-start gap-2">
      {back && (
        <button
          type="button"
          aria-label={t('Back')}
          onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}
          className="btn -ml-2 grid size-12 shrink-0 place-items-center rounded-full text-ink-900 hover:bg-primary-50"
        >
          <ArrowLeft className="size-6" strokeWidth={1.75} />
        </button>
      )}
      <div className={cx('min-w-0 flex-1', back && 'pt-2')}>
        <h1 className="text-h1 font-semibold text-ink-900">{title}</h1>
        {sub && <div className="mt-1 text-body text-ink-700">{sub}</div>}
      </div>
      {action && <div className="shrink-0 pt-1">{action}</div>}
    </div>
  )
}

/** Page body. Phones: 16 px margins. Desktop: 32 px padding, a 768 px reading column unless `wide`. */
export function Screen({ children, className, wide }: { children: ReactNode; className?: string; wide?: boolean }) {
  return <div className={cx('mx-auto w-full px-4 pt-4 pb-8 md:px-6 lg:px-8 lg:pt-8', wide ? 'max-w-[1200px]' : 'max-w-3xl', className)}>{children}</div>
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mt-6 mb-3 flex items-center justify-between gap-2">
      <h2 className="text-h2 font-semibold">{children}</h2>
      {action}
    </div>
  )
}

export function ListRow({ icon: Icon, title, sub, to, onClick, right, danger, iconTone = 'primary' }: { icon?: LucideIcon; title: ReactNode; sub?: ReactNode; to?: string; onClick?: () => void; right?: ReactNode; danger?: boolean; iconTone?: 'primary' | 'danger' | 'neutral' | 'success' | 'warning' }) {
  const tone = { primary: 'bg-primary-50 text-primary-600', danger: 'bg-danger-bg text-danger-text', neutral: 'bg-neutral-bg text-neutral-text', success: 'bg-success-bg text-success-text', warning: 'bg-warning-bg text-warning-text' }[iconTone]
  const inner = (
    <>
      {Icon && (
        <span className={cx('grid size-10 shrink-0 place-items-center rounded-full', tone)}>
          <Icon className="size-5" strokeWidth={1.75} aria-hidden />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={cx('block font-semibold', danger && 'text-danger-text')}>{title}</span>
        {sub && <span className="block text-small text-ink-700">{sub}</span>}
      </span>
      {right}
      {(to || onClick) && !right && <ChevronRight className="size-5 shrink-0 text-ink-500" aria-hidden />}
    </>
  )
  const cls = 'flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left'
  if (to)
    return (
      <Link to={to} className={cx(cls, 'transition-colors hover:bg-primary-50')}>
        {inner}
      </Link>
    )
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cx(cls, 'transition-colors hover:bg-primary-50')}>
        {inner}
      </button>
    )
  return <div className={cls}>{inner}</div>
}

export function List({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('divide-y divide-border-subtle overflow-hidden rounded-card border border-border-subtle bg-surface', className)}>{children}</div>
}

export function Avatar({ name, size = 40, tone = 'primary' }: { name: string; size?: number; tone?: 'primary' | 'neutral' }) {
  const ini = name.replace(/^Dr\.\s*/, '').split(' ').map((w) => w[0]).slice(0, 2).join('')
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={cx('grid shrink-0 place-items-center rounded-full font-semibold', tone === 'primary' ? 'bg-primary-100 text-primary-700' : 'bg-neutral-bg text-neutral-text')}
    >
      {ini}
    </span>
  )
}

export function Note({ tone = 'info', icon: Icon, children, className }: { tone?: 'info' | 'warning' | 'danger' | 'success' | 'neutral' | 'check'; icon?: LucideIcon; children: ReactNode; className?: string }) {
  const t = {
    info: 'bg-primary-50 text-primary-700 border-primary-100',
    warning: 'bg-warning-bg text-warning-text border-warning-border',
    danger: 'bg-danger-bg text-danger-text border-danger-border',
    success: 'bg-success-bg text-success-text border-success-border',
    neutral: 'bg-neutral-bg text-neutral-text border-border-subtle',
    check: 'bg-check-bg text-check-text border-warning-border',
  }[tone]
  return (
    <div className={cx('flex gap-3 rounded-card border p-3', t, className)}>
      {Icon && <Icon className="mt-0.5 size-5 shrink-0" strokeWidth={1.75} aria-hidden />}
      <div className="min-w-0 flex-1 text-body">{children}</div>
    </div>
  )
}

export function Stack({ children, className, gap = 3 }: { children: ReactNode; className?: string; gap?: 2 | 3 | 4 | 6 }) {
  return <div className={cx('flex flex-col', { 2: 'gap-2', 3: 'gap-3', 4: 'gap-4', 6: 'gap-6' }[gap], className)}>{children}</div>
}

/** Sticky bottom action bar inside a screen: main button in thumb reach */
export function ActionBar({ children }: { children: ReactNode }) {
  return <div className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] z-10 -mx-4 mt-6 border-t border-border-subtle bg-surface px-4 py-3 shadow-bar md:-mx-6 md:px-6 lg:bottom-0 lg:mx-0 lg:rounded-card lg:border lg:px-4">{children}</div>
}
