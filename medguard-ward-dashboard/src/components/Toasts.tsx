// Confirmations only ("Alert acknowledged"). Gone after 4 seconds. Never for errors that need action.
import { CircleCheck } from 'lucide-react';
import { useStore } from '../state/store';

export function Toasts() {
  const { toasts } = useStore();
  return (
    <div aria-live="polite" className="pointer-events-none fixed right-8 top-20 z-[60] flex flex-col items-end gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="flex items-center gap-2 rounded-card bg-ink-900 px-4 py-3 text-surface shadow-float">
          <CircleCheck size={20} aria-hidden className="text-success-border" />
          {t.text}
        </div>
      ))}
    </div>
  );
}
