// Text input with the label above, optional help line and an error that says how to fix it.
import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  help?: string;
  error?: string;
  /** Fixed text shown inside the field on the left, e.g. "+88". */
  prefix?: string;
}

export const Field = forwardRef<HTMLInputElement, Props>(function Field({ label, help, error, prefix, className = '', ...input }, ref) {
  const id = useId();
  const describedBy = [help && `${id}-help`, error && `${id}-err`].filter(Boolean).join(' ') || undefined;
  return (
    <div>
      <label htmlFor={id} className="block font-semibold">{label}</label>
      {help && <p id={`${id}-help`} className="text-sm text-ink-500">{help}</p>}
      <div className="relative mt-2">
        {prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-700">{prefix}</span>}
        <input
          id={id}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={`input w-full ${prefix ? 'pl-12' : ''} ${error ? 'border-2 border-danger-text' : ''} ${className}`}
          {...input}
        />
      </div>
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 flex items-center gap-1 text-sm text-danger-text">
          <AlertCircle size={16} aria-hidden className="shrink-0" /> {error}
        </p>
      )}
    </div>
  );
});
