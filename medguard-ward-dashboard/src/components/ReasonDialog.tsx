// Confirm + required reason, for override, decline, assign and publish (safety rule 10).
// Never animated or delayed: confirm dialogs must act instantly.
import { useEffect, useId, useRef, useState } from 'react';
import { useT } from '../state/store';

interface Props {
  open: boolean;
  title: string;
  body: string;
  actionLabel: string;
  destructive?: boolean;
  /** Field label and help, e.g. "Answer to patient" when the patient will read it. */
  reasonLabel?: string;
  reasonHelp?: string;
  /** Extra content above the reason field, e.g. a choice of patient. */
  children?: React.ReactNode;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function ReasonDialog({ open, title, body, actionLabel, destructive, reasonLabel, reasonHelp, children, onConfirm, onCancel }: Props) {
  const t = useT();
  const [reason, setReason] = useState('');
  const [showError, setShowError] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const ids = useId();

  // Keep the latest onCancel in a ref, so a parent re-render (e.g. a live event every few seconds)
  // does not re-run the effects below and wipe what the user is typing.
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;

  // Clear the field only when the dialog opens.
  useEffect(() => {
    if (!open) return;
    setReason('');
    setShowError(false);
    field.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && cancelRef.current();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 5) {
      setShowError(true);
      field.current?.focus();
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-6" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${ids}-title`}
        aria-describedby={`${ids}-body`}
        onSubmit={submit}
        className="w-full max-w-lg rounded-dialog bg-surface p-6 shadow-float"
      >
        <h2 id={`${ids}-title`} className="text-xl font-semibold">{title}</h2>
        <p id={`${ids}-body`} className="mt-2 text-ink-700">{body}</p>
        {children}

        <label htmlFor={`${ids}-reason`} className="mt-6 block font-semibold">{reasonLabel ?? t('dialog.reason')}</label>
        <p id={`${ids}-help`} className="text-sm text-ink-500">{reasonHelp ?? t('dialog.reasonHelp')}</p>
        <textarea
          id={`${ids}-reason`}
          ref={field}
          rows={3}
          value={reason}
          onChange={(e) => { setReason(e.target.value); setShowError(false); }}
          aria-invalid={showError}
          aria-describedby={`${ids}-help ${showError ? `${ids}-err` : ''}`}
          className={`input mt-2 h-auto w-full py-3 ${showError ? 'border-2 border-danger-text' : ''}`}
        />
        {showError && <p id={`${ids}-err`} className="mt-1 text-sm text-danger-text">{t('dialog.reasonError')}</p>}

        <div className="mt-6 flex justify-between gap-4">
          <button type="button" onClick={onCancel} className="btn-secondary">{t('dialog.cancel')}</button>
          <button type="submit" className={destructive ? 'btn-danger' : 'btn-primary'}>{actionLabel}</button>
        </div>
      </form>
    </div>
  );
}
